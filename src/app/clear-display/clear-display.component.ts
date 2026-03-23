import { CommonModule } from '@angular/common';
import { Component, Input, Inject} from '@angular/core';
import { ClearDataService } from '../services/clear-data.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type ClearTermConfig = {
  short_text?: string;
  hide?: boolean;
};

type ClearTermData = {
  case?: string;
  usage?: string;
  'definition-short'?: string;
  'definition-long'?: string;
};

type ClearDataPayload = {
  'license-name'?: string;
  [key: string]: string | ClearTermData | undefined;
};

@Component({
  selector: 'custom-clear-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clear-display.component.html',
  styleUrl: './clear-display.component.scss'
})
export class ClearDisplayComponent {

  @Input() private hostComponent!: any;

  constructor(@Inject('MODULE_PARAMETERS') public moduleParameters: any, private clearDataService: ClearDataService) {
    // TODO: find a better way to switch between test parameters and those provided by the add-on functionality.
    this.moduleParameters = this.normalizeParams(moduleParameters);
    console.log('Loaded module parameters for ClearDisplayComponent:', this.moduleParameters);
  }

  // Primo NDE passes add-on config through a Java Map, which serializes nested objects
  // using Java's toString() format ({key=value}) and converts booleans to strings.
  // These helpers convert that format back to proper JS objects.
  private normalizeParams(params: any): any {
    const result: Record<string, any> = {};
    for (const key of Object.keys(params)) {
      const val = params[key];
      if (typeof val === 'string') {
        if (val === 'true') result[key] = true;
        else if (val === 'false') result[key] = false;
        else if (val.startsWith('{')) result[key] = this.parseJavaMap(val);
        else result[key] = val;
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  private parseJavaMap(str: string): any {
    str = str.trim();
    if (!str.startsWith('{') || !str.endsWith('}')) {
      return str;
    }
    const inner = str.slice(1, -1).trim();
    if (!inner) return {};
    const result: Record<string, any> = {};
    for (const entry of this.splitEntries(inner)) {
      const eqIdx = entry.indexOf('=');
      if (eqIdx === -1) continue;
      const key = entry.slice(0, eqIdx).trim();
      const val = entry.slice(eqIdx + 1).trim();
      if (val === 'true') result[key] = true;
      else if (val === 'false') result[key] = false;
      else if (val.startsWith('{')) result[key] = this.parseJavaMap(val);
      else result[key] = val;
    }
    return result;
  }

  private splitEntries(str: string): string[] {
    const entries: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (ch === ',' && depth === 0) {
        if (current.trim()) entries.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) entries.push(current.trim());
    return entries;
  }

  protected clearData$: Observable<any> = of(null);

  public originalNote = '';

  // Helper function to clean up remaining empty HTML elements from the original note once CLEAR links have been removed.
  private stripEmptyHtmlElements(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement | null;

    if (!root) {
      return html;
    }

    // Remove empty elements from deepest nodes up so parent empties are also cleared.
    let changed = true;
    while (changed) {
      changed = false;
      const elements = Array.from(root.querySelectorAll('*')).reverse();
      for (const el of elements) {
        const hasChildren = el.children.length > 0;
        const hasText = (el.textContent ?? '').trim().length > 0;
        if (!hasChildren && !hasText) {
          el.remove();
          changed = true;
        }
      }
    }

    return root.innerHTML;
  }

  private getPublicNote(): string | null {
    let publicNote = this.hostComponent?.electronicService?.publicNote;
    if (!publicNote) {
      return null;
    }
    return publicNote;
  }

  // TODO: avoid having to repeat this list here, instead fetch it from the config or the data keys
  protected readonly displayOrder = [
    'cms',
    'course_pack',
    'durable_url',
    'e_reserves',
    'ill_print',
    'print',
    'distribute',
    'text_mining',
    'local_loading',
    'research'
  ];

  protected getVisibleTerms(data: ClearDataPayload | null | undefined) {
    if (!data) {
      return [];
    }

    return this.displayOrder
      .filter((key) => {
        const termConfig = this.moduleParameters.terms[key as keyof typeof this.moduleParameters.terms] as ClearTermConfig | undefined;
        const termData = data[key] as ClearTermData | undefined;
        return !!termData && !termConfig?.hide;
      })
      .map((key) => {
        const termConfig = this.moduleParameters.terms[key as keyof typeof this.moduleParameters.terms] as ClearTermConfig | undefined;
        const termData = data[key] as ClearTermData;

        return {
          key,
          shortText: termConfig?.short_text ?? key,
          caseText: termData.case ?? '',
          usage: termData.usage ?? '',
          shortDefinition: termData['definition-short'] ?? '',
          longDefinition: termData['definition-long'] ?? ''
        };
      });
  }

  private getOurData(publicNoteHtml: string): Observable<any> {
    let clearLinks = [...publicNoteHtml.matchAll(/<a +href="(https?:\/\/(clear|ocul)\.scholarsportal\.info)\/([^"]+)\/(.+?)".*?<\/a>/g)];
    this.originalNote = this.stripEmptyHtmlElements(
      publicNoteHtml.replace(/<a +href="(https?:\/\/(clear|ocul)\.scholarsportal\.info)\/([^"]+)\/(.+?)".*?<\/a>/g, '')
    );

    if (!clearLinks.length) {
      return of(null);
    }

    const firstLink = clearLinks[0];
    let clearBaseUrl = firstLink[1];
    let clearInstanceName = firstLink[3];
    let clearResourceName = firstLink[4];

    return this.clearDataService.fetchOurData(
      clearBaseUrl,
      clearResourceName,
      clearInstanceName,
      this.moduleParameters.local_instance
    ).pipe(
      catchError((error: any) => {
        console.error('Error fetching data from CLEAR API:', error);
        return of(null);
      })
    );
  }


  ngOnInit() {
    console.log('ClearDisplayComponent initialized');

    let publicNote = this.getPublicNote();
    console.log('Public note from host component:', publicNote);

    if (publicNote) {
      this.clearData$ = this.getOurData(publicNote);
    } else {
      console.log('No public note found in host component');
    }   
  }


}

import { CommonModule } from '@angular/common';
import { Component, Input} from '@angular/core';
import { ClearDataService } from '../services/clear-data.service';

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

  constructor(
    private clearDataService: ClearDataService
  ) {}

  protected clearData$ = this.clearDataService.clearData$;

  protected getTooltipText(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parser = new DOMParser();
    const decoded = parser.parseFromString(value, 'text/html').documentElement.textContent ?? '';

    return decoded
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getPublicNote(): string | null {
    let publicNote = this.hostComponent?.electronicService?.publicNote;
    if (!publicNote) {
      return null;
    }
    return publicNote;
  }

  // Temporarily hardcode settings
  protected oclsClearDisplayConfig$ = {
        compact_display : true,
        hover_text : false,
        title_text: '<b>Usage rights (hover on answer for details):</b>',
        local_instance: '',
        footer_text: 'More information',
        terms: {
            cms: {
                short_text: 'CMS?'
            },
            course_pack: {
                short_text: 'Course Packs?'
            },
            distribute: {
                hide: true
            },
            durable_url: {
                short_text: 'Link?'
            },
            e_reserves: {
                short_text: 'E-Reserve?'
            },
            ill_print: {
                short_text: 'ILL?'
            },
            local_loading: {
                hide: true
            },
            print: {
                short_text: 'Print?'
            },
            research: {
                hide: true
            },
            text_mining: {
                hide: true
            }
        }
  };

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
        const termConfig = this.oclsClearDisplayConfig$.terms[key as keyof typeof this.oclsClearDisplayConfig$.terms] as ClearTermConfig | undefined;
        const termData = data[key] as ClearTermData | undefined;
        return !!termData && !termConfig?.hide;
      })
      .map((key) => {
        const termConfig = this.oclsClearDisplayConfig$.terms[key as keyof typeof this.oclsClearDisplayConfig$.terms] as ClearTermConfig | undefined;
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

  private getOurData(publicNoteHtml: string): string | null {
    let clearLinks = [...publicNoteHtml.matchAll(/<a +href="(https?:\/\/(clear|ocul)\.scholarsportal\.info)\/([^"]+)\/(.+?)".*?<\/a>/g)];
    
    if (clearLinks){
      clearLinks.forEach((foundLink) => {
                                        
        // Remove the found link from the note
        let originalNote = publicNoteHtml.replace(foundLink[0],'');
        
        let clearBaseUrl = foundLink[1];
        let clearInstanceName = foundLink[3];
        let clearResourceName = foundLink[4];

        this.clearDataService.fetchOurData(clearBaseUrl,clearResourceName,clearInstanceName).subscribe({
          next: (clearData : any) => {
            console.log('Data fetched successfully:', clearData);
            // You can add any additional processing of the data here if needed
          },
          error: (error : any) => {
            console.error('Error fetching data from CLEAR API:', error);
          }
        });
      });
    }
    return null;
  }


  ngOnInit() {
    console.log('ClearDisplayComponent initialized');

    let publicNote = this.getPublicNote();
    console.log('Public note from host component:', publicNote);

    if (publicNote) {
      this.getOurData(publicNote);
    } else {
      console.log('No public note found in host component');
    }   
  }


}

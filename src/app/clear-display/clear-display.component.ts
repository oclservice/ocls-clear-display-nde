import { Component, Input} from '@angular/core';
import { ClearDataService } from '../services/clear-data.service';

@Component({
  selector: 'custom-clear-display',
  standalone: true,
  imports: [],
  templateUrl: './clear-display.component.html',
  styleUrl: './clear-display.component.scss'
})
export class ClearDisplayComponent {

  @Input() private hostComponent!: any;

  constructor(
    private clearDataService: ClearDataService
  ) {}

  private getPublicNote(): string | null {
    let publicNote = this.hostComponent?.electronicService?.publicNote;
    if (!publicNote) {
      return null;
    }
    return publicNote;
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
          next: (data : any) => {
            console.log('Data fetched successfully:', data);
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class ClearDataService {
  constructor(private http: HttpClient) {}

  private parseXmlToJson(xmlString: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');

    if (parseError) {
      throw new Error('Invalid XML response from CLEAR API');
    }

    return this.xmlNodeToJson(xmlDoc.documentElement);
  }

  private xmlNodeToJson(node: Node): any {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue?.trim() ?? '';
      return text.length > 0 ? text : null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const result: Record<string, any> = {};

    if (element.attributes.length > 0) {
      result['@attributes'] = {};
      for (const attr of Array.from(element.attributes)) {
        result['@attributes'][attr.name] = attr.value;
      }
    }

    const childElements = Array.from(element.childNodes).filter(
      child => child.nodeType === Node.ELEMENT_NODE
    );

    const textContent = Array.from(element.childNodes)
      .filter(child => child.nodeType === Node.TEXT_NODE)
      .map(child => child.nodeValue?.trim() ?? '')
      .join('')
      .trim();

    if (childElements.length === 0) {
      if (Object.keys(result).length === 0) {
        return textContent;
      }

      if (textContent) {
        result['#text'] = textContent;
      }

      return result;
    }

    for (const child of childElements) {
      const childName = child.nodeName;
      const childValue = this.xmlNodeToJson(child);

      if (result[childName] !== undefined) {
        if (!Array.isArray(result[childName])) {
          result[childName] = [result[childName]];
        }
        result[childName].push(childValue);
      } else {
        result[childName] = childValue;
      }
    }

    if (textContent) {
      result['#text'] = textContent;
    }

    return result;
  }

  // Define clearData as an observable with getter and setter.
  // This will help prevent the same data being fetched multiple times by different components.
  private _clearData = new BehaviorSubject<any>(null);
  public clearData$ = this._clearData.asObservable();

  set clearData(data: any) {
    this._clearData.next(data);
  }

  get clearData() {
    return this._clearData.value;
  }

  public resourceName: string = '';

  // Function to fetch data from OUR/CLEAR "API"
  fetchOurData(baseUrl: string, resourceName : string, instanceOriginal : string, instanceOverride: string = ''): Observable<any> {

    let instance = instanceOriginal;
            
    if (instanceOverride){
        instance = instanceOverride;
    }
       
    let url = baseUrl.replace('http://','https://') + '/' + instance + '/api/?tag=' + resourceName;
    let publicUrl = baseUrl.replace('http://','https://') + '/' + instance + '/' + resourceName;

    console.log('Fetching CLEAR data with URL:', url);
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((xmlResponse: string) => {
        console.log('Received XML response from CLEAR API');
        const parsedData = this.parseXmlToJson(xmlResponse);
        return { data: parsedData, publicUrl };
      }),
      tap(data => {
        console.log('Setting clearData with fetched data:', data);
        this.clearData = data;
      })
    );
  }
}
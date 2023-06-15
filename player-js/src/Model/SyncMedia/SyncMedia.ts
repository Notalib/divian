import { JsonElementType, JsonProperty, JsonType } from 'ta-json-x';
import SyncMediaDescription from './SyncMediaDescription';

/**
 * Implements:
 * https://github.com/readium/architecture/tree/sync-media/models/sync-media
 */
export default class SyncMedia {
  @JsonProperty('description')
  @JsonType(SyncMediaDescription)
  public description?: SyncMediaDescription;

  @JsonProperty('text')
  @JsonType(String)
  public text?: string;

  @JsonProperty('audioref')
  @JsonType(String)
  public audioRef?: string;

  public get audioFile() {
    const audioRef = this.audioRef;
    if (!audioRef) {
      return;
    }

    const url = new URL(audioRef);
    url.hash = '';
    return url.href;
  }

  @JsonProperty('textref')
  @JsonType(String)
  public textRef?: string;

  public get textFile() {
    const textRef = this.textRef;
    if (!textRef) {
      return;
    }

    const url = new URL(textRef);
    url.hash = '';
    return url.href;
  }

  public get textFragment() {
    const textRef = this.textRef;
    if (!textRef) {
      return;
    }

    return new URL(textRef).hash;
  }

  @JsonProperty('imgref')
  @JsonType(String)
  public imageRef?: string;

  public get imageFile() {
    const imageRef = this.imageRef;
    if (!imageRef) {
      return;
    }

    const url = new URL(imageRef);
    url.hash = '';
    return url.href;
  }

  @JsonProperty('role')
  @JsonElementType(String)
  public role?: string[];

  @JsonProperty('children')
  @JsonElementType(SyncMedia)
  public children?: SyncMedia[];

  public get sizeInfo() {
    const imageRef = this.imageRef;
    if (!imageRef) {
      return;
    }

    const fragment = new URL(imageRef).hash;
    if (!fragment) {
      return;
    }

    const pxRegexp = /#xywh=(percent:)?([\d]+),([\d]+),([\d]+),([\d]+)/;
    const m = pxRegexp.exec(fragment);
    if (!m) {
      return;
    }

    const [, , x, y, width, height] = m.map((v) => Number(v));

    return {
      x,
      y,
      width,
      height,
      isPercent: m[1] === 'percent:',
    };
  }

  public get clipPath() {
    const imageRef = this.imageRef;
    if (!imageRef) {
      return;
    }

    const prefix = '#xyn=percent:';
    const idx = imageRef.indexOf(prefix);
    if (idx === -1) {
      return;
    }

    const input = imageRef
      .substring(idx + prefix.length)
      .split(',')
      .map((i) => `${i}%`);

    if (input.length % 2 !== 0) {
      return;
    }

    const output = new Array<string>();
    for (let i = 0; i < input.length; i += 2) {
      const p1 = input[i];
      const p2 = input[i + 1];

      output.push(`${p1} ${p2}`);
    }

    return `polygon(${output.join(',')})`;
  }

  public get audioDuration(): number | undefined {
    return this.audioStartEnd?.duration;
  }

  public get audioStart() {
    return this.audioStartEnd?.start;
  }

  public get audioEnd() {
    return this.audioStartEnd?.end;
  }

  public get audioStartEnd() {
    const audioRef = this.audioRef;
    if (!audioRef) {
      return;
    }

    const url = new URL(audioRef);
    const m = /#t=([0-9]+(\.[0-9]+)?)?,([0-9]+(\.[0-9]+)?)/.exec(url.hash);
    if (!m) {
      throw new Error(audioRef);
    }

    const start = m[1];
    const end = m[3];

    return {
      start: Number(start),
      end: Number(end),
      duration: Number(end) - Number(start),
    };
  }

  public hasRole(role: string) {
    return !!this.role?.includes(role);
  }
}

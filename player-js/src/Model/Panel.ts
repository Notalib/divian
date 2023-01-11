import TextElement from './TextElement';
import { JsonElementType, JsonProperty, JsonType } from 'ta-json-x';

export default class Panel {
  @JsonProperty('title')
  @JsonType(String)
  public Title?: string;

  @JsonProperty('audio')
  @JsonType(String)
  public Audio?: string;

  @JsonProperty('fragment')
  @JsonType(String)
  public Fragment?: string;

  @JsonProperty('balloons')
  @JsonElementType(TextElement)
  public Balloons?: TextElement[];

  public get SizeInfo() {
    const pxRegexp = /#xywh=([\d]+),([\d]+),([\d]+),([\d]+)/;
    const m = pxRegexp.exec(this.Fragment);
    if (!m) {
      return null;
    }

    const [, x, y, width, height] = m.map((v) => Number(v));

    return {
      x,
      y,
      width,
      height,
    };
  }

  public get Width() {
    return this.SizeInfo?.width;
  }

  public get Height() {
    return this.SizeInfo?.height;
  }

  public get X() {
    return this.SizeInfo?.x;
  }

  public get Y() {
    return this.SizeInfo?.y;
  }
}

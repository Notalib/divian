import { JsonElementType, JsonProperty, JsonType } from 'ta-json-x';
import Panel from './Panel';

export default class NarratedPage {
  @JsonProperty('href')
  @JsonType(String)
  public Href = '';

  @JsonProperty('title')
  @JsonType(String)
  public Title = '';

  @JsonProperty('panels')
  @JsonElementType(Panel)
  public Panels: Panel[] = [];
}

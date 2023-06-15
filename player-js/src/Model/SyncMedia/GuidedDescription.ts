import { JsonProperty, JsonType } from 'ta-json-x';

export default class GuidedDescription {
  @JsonProperty('text')
  @JsonType(String)
  public text?: string;

  @JsonProperty('imgref')
  @JsonType(String)
  public imageRef?: string;

  @JsonProperty('audioref')
  @JsonType(String)
  public audioRef?: string;
}

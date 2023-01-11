import { JsonProperty, JsonType } from 'ta-json-x';

export default class TextElement {
  @JsonProperty('audio')
  @JsonType(String)
  public Audio?: string;

  @JsonProperty('clip-path')
  @JsonType(String)
  public ClipPath?: string;

  @JsonProperty('text')
  @JsonType(String)
  public Text?: string;

  @JsonProperty('fragment')
  @JsonType(String)
  public Fragment?: string;

  @JsonProperty('audioFragment')
  @JsonType(String)
  public AudioFragment?: string;

  @JsonProperty('type')
  @JsonType(String)
  public Type?: string;
}

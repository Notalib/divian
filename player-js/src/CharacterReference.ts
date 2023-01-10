import { JsonProperty, JsonType } from 'ta-json-x';

export default class CharacterReference {
  @JsonProperty('id')
  @JsonType(String)
  public Id = '';

  @JsonProperty('fragment')
  @JsonType(String)
  public Fragment?: string;
}

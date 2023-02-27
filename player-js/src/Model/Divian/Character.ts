import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import { JsonElementType, JsonProperty, JsonType } from 'ta-json-x';

export default class Character {
  @JsonProperty('id')
  @JsonType(String)
  public Id = '';

  @JsonProperty('name')
  public Name: string | DOMStringMap;

  @JsonProperty('age')
  @JsonType(String)
  public Age = '';

  @JsonProperty('gender')
  @JsonType(String)
  public Gender = '';

  @JsonProperty('roles')
  @JsonElementType(String)
  public Roles = new Array<string>();

  @JsonProperty('cover')
  @JsonElementType(Link)
  public Cover: Link | void;
}

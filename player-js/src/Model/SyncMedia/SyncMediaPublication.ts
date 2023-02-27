import { Publication } from 'r2-shared-js/dist/es8-es2017/src/models/publication';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import { JsonElementType, JsonProperty } from 'ta-json-x';

export default class SyncMediaPublication extends Publication {
  @JsonProperty('syncMedia')
  @JsonElementType(Link)
  public SyncMedia: Link[] = [];
}

import { Publication } from 'r2-shared-js/dist/es8-es2017/src';
import { JsonElementType, JsonProperty } from 'ta-json-x';
import Character from './Character';
import NarratedPage from './NarratedPage';

export default class DivianPublication extends Publication {
  @JsonProperty('narration')
  @JsonElementType(NarratedPage)
  public Narration: NarratedPage[] = [];

  @JsonProperty('characters')
  @JsonElementType(Character)
  public Characters: Character[] = [];
}

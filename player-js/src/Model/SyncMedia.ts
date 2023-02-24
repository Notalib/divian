import { JsonElementType, JsonProperty, JsonType } from 'ta-json-x';

/**
 * Implements:
 * https://github.com/readium/architecture/tree/sync-media/models/sync-media
 */
export default class SyncMedia {
  @JsonProperty('alt')
  @JsonType(String)
  public Alt?: string;

  @JsonProperty('text')
  @JsonType(String)
  public Text?: string;

  @JsonProperty('audioref')
  @JsonType(String)
  public AudioRef?: string;

  @JsonProperty('textref')
  @JsonType(String)
  public TextRef?: string;

  @JsonProperty('imgref')
  @JsonType(String)
  public ImageRef?: string;

  @JsonProperty('role')
  @JsonElementType(String)
  public Role?: string[];

  @JsonProperty('children')
  @JsonElementType(SyncMedia)
  public Children?: SyncMedia[];
}

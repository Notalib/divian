---
title: Digital Visual Audible Narratives (DiViAN)
---

**Status:**

Replaced by [sync-media](https://github.com/readium/architecture/pull/181).

**Editors:**

* Morten Sjøgren ([Nota](https://nota.dk))

**Participate:**

* [Github - Notalib/DiViAN](https://github.com/Notalib/divian)
* [File an issue](https://github.com/Notalib/Merkur)

## Example

```json
{
  "@context": "http://readium.org/webpub-manifest/context.jsonld",
  
  "metadata": {
    "author": "Sussi Bech",
    "conformsTo": "https://merkur.nota.dk/docs/profiles/divian",
    "published": "2013-05-30T00:00:00+00:00",
    "publisher": "Carlsen Comics",
    "title": "Gravrøverne"
  },

  "links": [
    { "rel": "self", "href": "https://notalib.github.io/divian/books/nofret-gravroeverne/manifest.json", "type": "application/divian+json" }
  ],

  "readingOrder": [
    {
      "title": "Sussi Bech: Gravrøverne",
      "href": "39619-0001-generic.xhtml",
      "type": "text/html"
    },
    {
      "title": "Om denne udgave",
      "href": "39619-0002-generic.xhtml",
      "type": "text/html"
    },
    {
      "rel": "cover",
      "href": "forside.jpg",
      "type": "image/jpeg",
      "height": 3448,
      "width": 2480
    }, 
    {
      "href": "image00001.jpg",
      "type": "image/jpeg",
      "height": 3452,
      "width": 2431
    }, 
    {
      "href": "image00002.jpg",
      "type": "image/jpeg",
      "height": 3452,
      "width": 2432
    }
  ],
  "narrated": [
    {
      "href": "forside.jpg",
      "panels": [
        {
          "title": "Panel 1",
          "fragment": "#xywh=4,4,2471,3439",
          "texts": [
            {
              "fragment": "#xywh=504,151,451,78",
              "clip-path": "polygon(38.47%% 4.47%%,38.43%% 6.61%%,20.32%% 6.53%%,20.36%% 4.38%%)",
              "text": "Sussi Bech"
            },
            {
              "fragment": "#xywh=74,289,1338,428",
              "clip-path": "polygon(56.90%% 8.82%%,56.69%% 20.77%%,2.98%% 20.33%%,3.19%% 8.38%%)",
              "text": "Nofret"
            },
            {
              "fragment": "#xywh=467,784,524,71",
              "clip-path": "polygon(39.92%% 24.77%%,18.83%% 24.77%%,18.83%% 22.74%%,39.92%% 22.74%%)",
              "text": "Gravrøverne"
            },
            {
              "fragment": "#xywh=1718,3255,663,79",
              "clip-path": "polygon(95.97%% 96.66%%,69.27%% 96.66%%,69.27%% 94.40%%,95.97%% 94.40%%)",
              "text": "Carlsen Comics"
            }
          ]
        }
      ]
    }
  ]
}
```

## Introduction

The goal of this specification is to provide a profile dedicated to visual audible narratives for the [Readium Web Publication Manifest](https://readium.org/webpub-manifest).

This profile relies on:

* the use of [presentation hints](https://readium.org/webpub-manifest/modules/presentation.html) for specifying display constraints,
* the definition of a new collection type for implementing [narrated navigation](#4-narrated-navigation),
* the [transitions module](https://readium.org/webpub-manifest/modules/transitions.html) to manage transitions between resources of the reading order.

While the **Digital Visual Audible Narrative** Manifest is technically a profile of the Readium Web Publication Manifest, it has its own media type in order to maximize compatibility with dedicated apps: `application/divian+json`.

## 2. Listing Resources

A visual audible narrative is divided into one or more images and optional text pages, which are all listed in the `readingOrder` of the manifest.

All Link Objects to images **should** include `width` and `height` to indicate the dimensions of each resource.

## 3. Alternate Resources

In order to provide multiple variants of the same resource, Link Objects in the `readingOrder` **may** rely on the `alternate` key.

All Link Objects present in the `alternate` array:

* **must** indicate their media-type using `type`
* **should** indicate their dimensions using `height` and `width`

### Example 1: A resource available in JPEG and WebP

```json
{
  "href": "page1.jpeg", 
  "type": "image/jpeg", 
  "height": 3448,
  "width": 2480,
  "alternate": [
    {
      "href": "page1.webp", 
      "type": "image/webp",
      "height": 3448,
      "width": 2480
    }
  ]
}
```

### Example 2: A resource available in two different resolutions

```json
{
  "href": "page1.jpeg", 
  "type": "image/jpeg",
  "width": 546,
  "height": 760,
  "alternate": [
    {
      "href": "page1-high.jpeg", 
      "type": "image/jpeg",
      "width": 1092,
      "height": 1520
    }
  ]
}
```

## 4. Narrated navigation

In addition to having [a table of contents](https://readium.org/webpub-manifest/#6-table-of-contents), a visual audible narrative **must** also provide narrated navigation.

This document introduces a new collection role to fulfill that goal:

| Role       | Definition                                                                 | Compact Collection? | Required? |
| ---------- | -------------------------------------------------------------------------- | ------------------- | --------- |
| `narrated` | Identifies a collection containing narrated navigation into a publication. | Yes                 | Yes       |

To avoid duplicating content between `readingOrder` and `narration`, Link Objects referenced in `narration` **must** only contain `href` and `title`.

### Narration object

| Name         | Description                                                                                 | Required? |
| ------------ | ------------------------------------------------------------------------------------------- | --------- |
| `href`       | Link to a image. This must also be in `readingOrder`, **should not** have a media fragment. | Yes       |
| `title`      | Page title                                                                                  | No        |
| `panels`     | Ordered list of panels                                                                      | Yes       |
| `characters` | List of characters. [See](#reference-from-narration)                                        | No        |

#### Panels

| Name         | Description                                                                                                                                                         | Required? |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `fragment`   | [Spatial Dimension](https://www.w3.org/TR/media-frags/#naming-space) for the panel. If alternative resolutions are available this **should** use percentage values. | Yes       |
| `title`      | Page title                                                                                                                                                          | No        |
| `texts`      | Text parts of the panel. [See](#text-elements)                                                                                                                      | No        |
| `characters` | List of characters in the panel. [See](#reference-from-narration)                                                                                                   | No        |
| `audio`      | Audio href [TemporalDimension](https://www.w3.org/TR/media-frags/#naming-time) is allowed but `texts` **must** be within the same time frame.                       | No        |

##### Text elements

| Name            | Description                                                                                                              | Required? |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| `fragment`      | [Spatial Dimension](https://www.w3.org/TR/media-frags/#naming-space) for the panel                                       | Yes       |
| `audioFragment` | [TemporalDimension](https://www.w3.org/TR/media-frags/#naming-time), if used **must** within the `audio` from the panel. | No        |
| `clip-path`     | CSS [clip-path](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) for the text element.                        | No        |
| `text`          | Text being read, this is needed for TTS or closed caption.                                                               | No        |
| `type`          | Type of text element, `speech`, `caption` or `sound`. If not set, `speech` **should** be assumed.                        | No        |
| `character`     | Character object.  [See](#reference-from-narration)                                                                      | No        |

### Example 4: Narrated navigation with full page displayed before panels

```json
"narration": [
  {
    "href": "page1.jpeg",
    "title": "Page 1",
    "panels": [
      {
        "fragment": "#xywh=percent:0,0,100,100",
        "title": "Full page"
      },
      {
        "fragment": "#xywh=0,0,300,200",
        "title": "Panel 1"
      },
      {
        "fragment": "#xywh=300,200,310,200",
        "title": "Panel 2"
      }
    ]
  }
]
```

## 5. Characters (optional)

A visual audible narrative can give additional information about characters in the narrative.
This can help with `TTS` and `closed caption`.

This document introduces a new collection role to fulfill that goal:

| Role         | Definition                                                          | Required? |
| ------------ | ------------------------------------------------------------------- | --------- |
| `characters` | List of characters in the publication. [Object](#character-object). | No        |

### Character object

| Name     | Description                                                                       | Required? |
| -------- | --------------------------------------------------------------------------------- | --------- |
| `id`     |                                                                                   | Yes       |
| `name`   | Multi lang name of the character                                                  | Yes       |
| `roles`  | List of roles                                                                     | No        |
| `age`    | Age can be a number or a string description                                       | No        |
| `gender` | `male`, `female`, `not-applicable` or `other`                                     | No        |
| `voice`  | **TODO:** Voice profile for TTS, inspired by <https://www.w3.org/TR/css-speech-1> | No        |

### Reference from narration

Characters can be referred to from [narration](#narration-object), [panels](#panels) and [text elements](#text-elements) via this object.

| Name        | Description                                                  | Required? |
| ----------- | ------------------------------------------------------------ | --------- |
| `id`        |                                                              | Yes       |
| `fragment`  | Media fragment of the position.                              | No        |
| `clip-path` | <https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path> | No        |

## 6. Packaging

A *DiViAN* publication may be distributed unpackaged on the Web, but it may also be packaged for easy distribution as a single file. To achieve this goal, this specification defines the [Readium Packaging Format (RPF)](https://readium.org/webpub-manifest/packaging.html).

To maximize compatibility with dedicated apps, such a package has its own file extension and media-type:

* its file extension **must** be `.divian`
* its media type **must** be `application/divian+json`

As an alternative, the manifest may also be included into an EPUB 3 publication, an hybrid solution also specified in the [Readium Packaging Format (RPF)](https://readium.org/webpub-manifest/packaging.html) specification. This approach allows a publisher to create EPUB 3 fixed layout comics which are enriched by transitions, narrated navigation, sounds etc. accessible via *DiViAN* compliant applications.

## Appendix A. Compliance Levels

TODO:

## Appendix B. Examples

### Example: Nofret - Gravrøverne

DiViAN comic book with danish narration, see the [manifest](/books/nofret-gravroeverne/manifest.json) or open in [demo player](/divian/player).

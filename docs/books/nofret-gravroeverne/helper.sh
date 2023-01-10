#!/bin/bash

set -e

OFFSET=4

NARRATED_ITEMS=$(jq '.narration | length' < manifest.json)
NARRATED_ITEMS=$(( $NARRATED_ITEMS - 1 ))

#echo $NARRATED_ITEMS

INPUT_DIR=/mnt/c/Users/b044552/Downloads/39619

for I in $(seq 0 $NARRATED_ITEMS); do
  FILE_I=$(( $I + $OFFSET ))

  #echo "I=${I} FILE=${FILE_I}"
  FILENAME="${INPUT_DIR}/39619-$(printf '%04d' $FILE_I)-generic.json"
  NUM_PANELS=$(jq ".narration[${I}].panels | length" < manifest.json);

  NUM_NARRATIONS=$( jq ".narration[0].narration | length" < $FILENAME)

  if [[ $(( $NUM_PANELS + 1 )) != $NUM_NARRATIONS ]]; then
    echo "Skipping $I - $FILENAME"
    echo "  - DiViAN panels: ${NUM_PANELS}"
    echo "  - Media overlay items: ${NUM_NARRATIONS}"
    continue
  fi

  for J in $(seq 0 $(( $NUM_PANELS - 1 ))); do
   AUDIO=$(jq -r ".narration[0].narration[$(( $J + 1 ))].audio" < $FILENAME)

   if [[ $J == 0 ]]; then
     AUDIO="$(echo $AUDIO | cut -d\# -f1)#0,$(echo $AUDIO | cut -d, -f2)"
   fi 

   jq --arg audio $AUDIO -e ".narration[$I].panels[$J].audio = \$audio" < manifest.json | sponge manifest.json
  done

  echo $FILENAME
done

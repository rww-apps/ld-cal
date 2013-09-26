#!/bin/sh

read -p "Please provide the URI of the target dir (ex: http://example.org/apps/myapp/): " HOST
if [ "$HOST" = "" ]
then
    read -p "Please provide the URI of the target dir (ex: http://example.org/apps/myapp/): " HOST
fi

# add trailing slash to target dir if not present
if [ `echo "$HOST" | grep "[^/]$"` ]; then HOST="$HOST/"; fi

# create the dir structure
for dir in `find . -mindepth 1 -type d | sed "s|^\./||"`:
do
    echo "Creating dir: $dir"
    curl -X 'MKCOL' $HOST$dir
done

# upload the files now
for file in `find . -mindepth 1 -type f | sed "s|^\./||"`:
do
    # remove trailing ":" (weird)
    if [ ! `echo "$file" | grep "[^:]$"` ]; then file="${file%?}";fi

    echo "Uploading file: $HOST$file"
    curl --upload-file $file $HOST$file
done

#!/bin/sh

# RWW.IO Web app deployer. Simply run `sh deploy.sh` inside your Web app dir and follow the steps.

CERTCMD=""

# get target URI
read -p "Please provide the URI of the target dir (ex: http://example.org/apps/myapp/): " HOST
if [ "$HOST" = "" ]
then
    read -p "Please provide the URI of the target dir (ex: http://example.org/apps/myapp/): " HOST
fi

# get certificate path
read -p "Please provide the path containing the name of your certificate file, in PEM format (leave blank if none): " CERT

# add trailing slash to target dir if not present
if [ `echo "$HOST" | grep "[^/]$"` ]; then HOST="$HOST/"; fi

# add cert arguments to the curl command
if [ "$CERT" != "" ]; then CERTCMD="-E $CERT";fi

# create the dir structure (using MKCOL to increase interoperabilty)
for dir in `find . -mindepth 1 -type d ! -path ./.git\* | sed "s|^\./||"`:
do
    echo "Creating dir: $dir"
    curl -X 'MKCOL' $CERTCMD $HOST$dir
done

# upload the files now
for file in `find . -mindepth 1 -type f ! -path ./.git\* | sed "s|^\./||"`:
do
    # remove trailing ":" (weird)
    if [ ! `echo "$file" | grep "[^:]$"` ]; then file="${file%?}";fi

    echo "Uploading file: $HOST$file"
    curl --upload-file $file $CERTCMD $HOST$file
done

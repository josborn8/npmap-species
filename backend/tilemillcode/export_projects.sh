#!/bin/bash

if test $# -ne 4; then
   echo 'usage: export_projects.sh node_directory tilemill_directory mapbox_directory geotiff_directory'
   exit 1
fi

file_ext="mbtiles"

node_dir=${1%/}
tilemill_dir=${2%/}
export_cmd=$node_dir' '$tilemill_dir'/index.js export'
mapbox_dir=${3%/}
export_dir=$mapbox_dir/export
geotiff_dir=${4%/}

echo $(date) > export_start_time.txt
echo $(date +%s) > export_start_secs.txt

rm -rf $export_dir/*.*

while read line; do
   for sp in $line; do
      sp=${sp%.tif}
      echo $export_cmd $sp $export_dir/$sp.$file_ext
      $export_cmd $sp $export_dir/$sp.$file_ext
   done
done <<< $(ls $geotiff_dir)

echo $(date) > export_stop_time.txt
echo $(date +%s) > export_stop_secs.txt

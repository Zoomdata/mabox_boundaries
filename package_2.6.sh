#!/bin/bash

command -v zip >/dev/null 2>&1 || { echo >&2 "This script requrires the zip utility.  Aborting.";exit 1; }

zip -r ~/temp/test/mabox_boundaries.zip version visualization.json components
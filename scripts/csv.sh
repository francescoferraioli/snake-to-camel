#!/bin/bash

LOG_FILE=${1:-ignore/snake-to-camel.log}

cat $LOG_FILE | grep 'SNAKE_TO_CAMEL_CSV:' | sed 's/^SNAKE_TO_CAMEL_CSV://'

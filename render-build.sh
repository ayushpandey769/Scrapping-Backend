#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npx playwright install
npx playwright install-deps

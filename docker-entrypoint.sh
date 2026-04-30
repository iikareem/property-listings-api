#!/bin/sh

set -e

echo "Running migrations"
node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register node_modules/typeorm/cli.js migration:run -d data-source.ts

echo "Seeding database"
node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register src/seeder.ts

echo "Starting app..."
node dist/main
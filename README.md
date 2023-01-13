# Digital Visual Audible Narratives (DiViAN)

## Github page

The github page including `conformsTo` are located in `docs`.

Example books goes into `docs/books`, mind size restrictions ~1 GB on github pages.

GitHub deploys to <https://notalib.github.io/divian/> from the `main` branch.

## Demo player

Demo DiViAN player is located in `player-js`, it is written in `typescript` and uses `lit-element`.

### Development

Run `npm start` from the `player-js` folder, this serves the project to <http://localhost:4200> and watches for changes.

### Release updates

Run `npm run build` from the `player-js` folder, commit the changed files from `docs/player` and push to github. Github will deploy the site within a few minutes.

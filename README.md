# Hidden Gems: The Best of Bucknell

**Team:** 455 MCD (Luke Sokolofsky, Liam Nguyen)

**Play it:** https://hoangliam2503.github.io/hidden-gems/ · works on iPhone (Safari) and Android (Chrome). Add it to your home screen to use it like an app.

## Why it's worth playing

Most people walk past these spots every day without seeing them. Hidden Gems turns a five-minute walk from Taylor Hall to the Rooke Science Center into four small discoveries:

1. **The Tree in a Stone Cloak:** a weeping tree in its own ring of fieldstone that thousands of students pass without looking up.
2. **Messages from Another Time:** a marble slab by artist Agnes Denes (1986) that carries humanity's great equations, tucked beside a quiet science entrance.
3. **Where Careers Take Root:** a little brick house named for plants that now grows careers.
4. **The Elements Underfoot:** a rainbow periodic table chalked at the foot of Rooke's grand staircase.

Each clue is a small riddle. Each spot pays off with a fact you can tell your friends. At the end you get an album of your photos to share.

## How it works

1. **Read the clue.** A heat meter glows hotter as you get closer, but it never shows the exact spot.
2. **Take the photo.** The app checks two things:
   - **Location:** GPS has to put you inside the gem's radius. The check allows for GPS inaccuracy.
   - **Photo match:** an AI model runs on your phone (MobileNet v2 in TensorFlow.js) and compares your photo with reference shots of the spot. The photo has to clear that gem's threshold and also match it better than any other gem, so look-alike brick spots aren't confused. No photo ever leaves your phone.
3. **Unlock the next clue.** After the last gem you get your album and a collage you can share.

**Nobody gets stuck:**
- Hints come in steps.
- After the text hints, you can ask for one last hint: a blurred photo of the spot.
- If a check fails, the app tells you whether it was the place or the shot.
- If location is turned off, the app checks the photo only, with a stricter match.
- After three misses you can keep your photo and move on.
- Progress and photos survive closing the app.

## For judges

Stop 1 (the weeping tree) is about 280 ft from Taylor Hall. To play the whole hunt from the showcase room, open the app with **`?judge=1`** added to the link:

https://hoangliam2503.github.io/hidden-gems/?judge=1

| | Normal mode | Judge mode |
|---|---|---|
| **Stop 1** | Location + photo checked | Same: checked for real |
| **Location at stops 2–4** | Must be at the spot | Skipped |
| **Photo check at stops 2–4** | Yes | Still runs, and shows the match score (score / needed / best other stop) |
| **"Keep this photo & move on"** | After 3 misses | Right after the first miss |
| **Badge** | None | "Judge mode" in the top-right corner |

Hints, the found screens, the album and the collage work the same in both modes.

**In practice:** walk to the tree and play stop 1 for real. At stops 2–4 a photo taken in the showcase room won't match, so tap "Keep this photo & move on" to continue to the album.

Judge mode is remembered on that device. Open the link with `?judge=0` to turn it off.

## Building your own hunt (team notes)

- All hunt content lives in [`gems.js`](gems.js): clues, hints, coordinates, radius, match threshold, and facts.
- **Scout a spot:** open `/tools/scout.html` on a phone at the spot. Wait until accuracy is under ~10 m, then copy the lat/lng.
- **Add reference photos:** take 3–4 photos of each spot from slightly different angles. Then run:
  ```
  python3 tools/add_refs.py <gem-id> IMG_1.jpg IMG_2.jpg ...
  ```
  The script saves resized copies to `gems/<gem-id>/` and prints the `refs:` line for `gems.js`.
- **Calibrate:** in scout, test photos that are right and photos of nearby look-alikes. Set each gem's `threshold` between the two groups of scores.
- After you change the model or reference photos, bump `VERSION` in [`sw.js`](sw.js) so phones re-download them.

## Tech

Plain HTML, CSS, and JavaScript as a progressive web app. There's no build step, and it's hosted on GitHub Pages. TensorFlow.js 4.22.0 and the MobileNet v2 feature-vector model are included in the repo, so after the first load the app works offline.

Run it locally:
```
python3 -m http.server 8765
```
Then open http://localhost:8765.

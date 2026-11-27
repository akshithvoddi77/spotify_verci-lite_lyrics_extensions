<img width="226" height="120" alt="Screen_Recording_2026_11_27_152640" src="https://github.com/user-attachments/assets/3c0d5b7a-3507-471b-b6b9-ea25c4060b78" />
# Verci Lite — animated lyrics for Spotify (Spicetify extension)

A [Spicetify](https://spicetify.app) extension that shows synced lyrics lit **word by word** over an animated
space scene, inside a small draggable panel or a full-window view. Inspired by the look of Verci Lyrics.

Current version: **v2.6**

## Install

1. Install [Spicetify](https://spicetify.app) and the desktop Spotify from spotify.com (the Microsoft Store version is not supported).
2. Copy `verci-lite.js` into your Spicetify `Extensions` folder (find it with `spicetify path userdata`; on Windows it is usually `%appdata%\spicetify\Extensions`).
3. Register and apply it:
   ```
   spicetify config extensions verci-lite.js
   spicetify apply
   ```
4. Fully quit Spotify (including from the system tray) and reopen it.

A purple **"Verci Lite v2.6 running"** banner shows at the top for about 8 seconds when it loads.

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Show / hide the overlay | `Ctrl` + `Shift` + `L` |
| Next lyric style | `Ctrl` + `Shift` + `S` |
| Next background | `Ctrl` + `Shift` + `B` |
| Cycle panel size (small / medium / large) | `Ctrl` + `Shift` + `M` |
| Switch between panel and full view | `Ctrl` + `Shift` + `F` |
| Leave full view | `Esc` |

## Mouse controls

| Action | How |
|---|---|
| Move the panel | Click and drag it |
| Panel ↔ full view | Double-click the panel |

## Menu and top bar

Every action is also available without shortcuts. Click your **profile picture** in Spotify:

- Verci Lite: show/hide
- Verci Lite: next style
- Verci Lite: next background
- Verci Lite: panel / full view
- Verci Lite: panel size
- Verci Lite: reset panel position

There is also a **"Verci Lite lyrics"** button in the top bar that shows or hides the overlay.

## Lyric styles

Press `Ctrl+Shift+S` to cycle in this order:

1. **Warp** (default) — the current word pops in huge, with the whole line underneath; sung words stay bright.
2. **Stack** — previous, current and next word, with the current one large.
3. **Fisheye** — a tight stack of three words with a lens glow behind them.
4. **Code** — the line typed out like code, words joined by dots, with a blinking red cursor.
5. **Constellation** — each word is a star, joined by lines as it is sung.
6. **Branches** — a line draws itself across the panel; each word lights a node with a twig.
7. **Web** — an orb web with one glowing strand per word, dewdrops, and a spider that walks to the current word.

## Backgrounds

Press `Ctrl+Shift+B` to cycle:

- **Space** (default) — drifting starfield with nebula glow and shooting stars; stars streak forward on every word.
- **Black** — pure black with a soft pulse in the middle.
- **Clear** — dark frosted glass.

## Panel sizes

| Size | Dimensions |
|---|---|
| Small | 360 × 190 |
| Medium (default) | 460 × 240 |
| Large | 640 × 330 |

Text scales with the panel. Full view fills the whole Spotify window.

## Features

- Lyrics come from Spotify's own synced lyrics first, with [LRCLIB](https://lrclib.net) as a backup. They are fetched live and never stored.
- Works while paused, so a loaded song shows its lyrics before you press play.
- Re-checks the current song about once a second, in case Spotify misses a song-change event.
- If no lyrics are found, the overlay says why for each source.
- Remembers your overlay on/off state, style, background, panel or full view, panel size and panel position between launches.
- The banner turns red and shows the message if a script error occurs.

## Limitations

- Spotify only provides line timings, so word timing is estimated by spreading each line's time across its words by length. It is close, but not exact per-word timing.
- Songs that only have plain, unsynced lyrics will not display.
- The Spotify lyrics endpoint is not a public API and may change; if lyrics stop loading after a Spotify update, run `spicetify apply` again.
- Real fullscreen may be blocked by Spotify; full view still fills the Spotify window.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Extension "verci-lite.js" not found` | The file is not in the Extensions folder. Check with `spicetify path userdata`. |
| No banner on startup | Run `spicetify apply` again, then fully quit and reopen Spotify. |
| Old behaviour after updating | Check the file size/version: `Select-String -Path "$env:APPDATA\spicetify\Extensions\verci-lite.js" -Pattern "v2.6"` should print a line. |
| Overlay is hidden | Use the profile menu: **Verci Lite: show/hide**. |
| Panel is off-screen | Use the profile menu: **Verci Lite: reset panel position**. |
| Another lyrics extension clashes | Disable it, e.g. `spicetify config extensions lyrics-glass.js-` then `spicetify apply`. |

## Credits

Lyrics sync data from Spotify and [LRCLIB](https://lrclib.net). Visual styles are inspired by Verci Lyrics; all artwork in this extension is drawn in code.

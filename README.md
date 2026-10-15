# Alatar's Graph

![A blue wizard faces a giant spider across a luminous web of connections](assets/alatar-web-battle.png)

A standalone investigation graph workspace built with [Cytoscape.js](https://js.cytoscape.org/). Explore a fictional case in the browser, then build your own entity and relationship graphs. The opening graph and starter CSV files contain synthetic data.

The shared web and Windows interface uses Alatar's Graph's midnight-blue theme. Saved graphs using the earlier default entity colors adopt the blue palette when opened; other custom colors stay as chosen.

## Run

The offline local demo requires Node.js 18 or newer. It needs no package install, account, API key, or internet connection. PostgreSQL and Google Drive setup are described below.

```sh
node server.js
```

Open <http://127.0.0.1:4173/>.

## Windows desktop prototype

The desktop build keeps the graph editor and local project storage in one app. It uses a free local port and saves projects in a `graphs` folder under Electron's per-user app-data directory. Use **Local graphs → Save current graph** for durable storage, and **Open saved graph** to reopen one. Project JSON export remains available for backups. The desktop prototype shows local storage only; the browser version below retains the other connection options.

To run or build it on Windows x64 with Node.js 22+ and pnpm:

```sh
pnpm install
pnpm desktop:setup
pnpm desktop
```

In a separate terminal, build the portable ZIP:

```sh
pnpm pack:win
```

`pnpm pack:win` creates `dist/AlatarsGraph-Windows-x64.zip`. Extract the complete ZIP and run `AlatarsGraph.exe` inside its folder. The prototype is portable and unsigned; it has no installer or automatic updater. End users of the ZIP do not need Node.js or pnpm.

## Investigate

- Start a blank graph, add entities and directed connections, or open a project JSON file.
- Import paired entity and connection CSVs. The preview reports record counts, skipped rows, and unmatched endpoints. Endpoint IDs must match exactly; names alone do not merge entities. You may create explicitly marked placeholder entities for unresolved IDs.
- Search by entity ID, name, notes, or attributes. The left panel holds filters; the slim bar above the graph holds layout, fit, and zoom controls. Filter by entity type, relationship, jurisdiction, evidence status, active date, selected entity's neighbors, or isolated entities. Filters only change the view.
- Select a node or connection to open its attribute card on the right and edit notes, dates, evidence status, properties, source excerpts, and appearance. The right panel is resizable on desktop; narrow screens use left and right drawers. Icons include people, groups, buildings, government, locations, accounts, websites, phones, documents, financial entities, vehicles, vessels, aircraft, and devices.
- Shift/Ctrl-click or Shift-drag to select several records; Ctrl/Cmd+A selects everything in view. Apply a color or node icon to a selection, or delete it with a confirmation that counts attached connections. Esc clears selection.
- Drag a node label freely or slide a connection label along its edge. The attribute view also has label position controls.
- Undo and redo edits, moves, layout changes, additions, imports, and deletions. Deleting an entity confirms and removes all its attached connections, including those hidden by filters.
- Save a project JSON file, or export a PNG of the chart. The browser autosaves a local draft after edits and restores it on refresh. Clearing site data removes the draft, so keep a project file for durable storage.

## Project files

Alatar's Graph saves its own `alatar-graph` version 1 JSON format. Project files contain a graph ID, title, description, nodes, edges, positions, attributes, source records, status, dates, icons, and appearance settings.

CSV auto-mapping recognizes common `id`, `entity_id`, `label`, `canonical_name`, `source`, `target`, `relationship`, `status`, `start_date`, and `end_date` columns. It also accepts attribute/value rows keyed by entity ID. Choose all related CSV files at once. Review the preview, especially skipped rows and placeholders, before opening the graph.

Starter files are in `templates/entities.csv` and `templates/connections.csv`.

Imports are limited to 2 MB per file, 5,000 entities, and 12,000 connections. Imported claims are assertions supplied with the file; this tool does not verify them. The fictional demo is safe to explore without case data.

## Local scope

Alatar's Graph opens with a fictional demo case and keeps a recovery draft in browser storage. Use **Data Connections** to save a project to the local server, PostgreSQL, or your Google Drive. Remote saves are explicit; browser drafts continue after edits. The app sends graph data only when you choose a connection and save. There is no telemetry.

The repository contains synthetic demo records only. Local server projects under `data/` and common environment, key, and database files are Git ignored. Project JSON and CSV exports can contain investigation data; review them before committing or sharing.

### Local server

Run `node server.js`, then choose **Data Connections → Local server**. Projects are saved under `data/graphs/` and that directory is Git ignored. Use **Open saved graph** to load one. Each save uses a revision token to catch changes made by another process. Keep project file exports as backups.

### PostgreSQL

Install dependencies with `npm install`, set `ALATARS_GRAPH_DATABASE_URL` to your PostgreSQL connection URI in the server environment, then start `npm start`. Use **Data Connections → PostgreSQL**. The server creates an `alatar_graphs` table on first use and stores project JSON in a `jsonb` column. The URI and password are never entered in the browser. Use a dedicated database and least privilege credentials. The local server and MCP process must use the same URI to share graphs. NocoDB can expose a PostgreSQL database but is not required; DuckDB is a different embedded database engine and is not a PostgreSQL endpoint.

### Google Drive

In a Google Cloud project, enable the Drive API, configure the OAuth consent screen, and create a **Web application** OAuth client with `http://127.0.0.1:4173` as an authorized JavaScript origin. Enter that public client ID in **Data Connections → Google Drive** and connect. The app requests the `drive.file` scope, which covers files it creates; it stores the access token only in memory and the client ID in browser storage. Save and open graph JSON files explicitly. The Google account flow needs internet access and consent, so the offline demo cannot complete it. The local MCP server does not use this browser token. See [Google's token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and [Drive file scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

### MCP for AI tools

Open **Data Connections → MCP for AI** and copy the shown stdio server configuration into a compatible AI client's MCP settings. Start with the local server storage or set the same `ALATARS_GRAPH_DATABASE_URL` in the AI client's MCP server environment to use PostgreSQL. The server exposes `list_graphs`, `get_graph`, `create_graph`, `upsert_entity`, `upsert_connection`, and `delete_record`. It reads and writes the same project store as the browser's Local server or PostgreSQL option; refresh or reopen a graph in the browser to see AI edits. Browser saves with an outdated revision fail rather than silently overwriting the AI's work. Review AI tool permissions before granting writes.

The MCP server uses the stdio protocol and does not listen on the network. Its stdout contains protocol messages only. For a manual smoke test, run `node mcp-server.js` and send newline-delimited JSON-RPC `initialize`, `tools/list`, and `tools/call` messages.

Claude Desktop and other local MCP clients can launch that stdio command. [ChatGPT connects to remote MCP servers](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt); for a private local server, its [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) can forward to a local stdio command after you configure a tunnel in your own account. This repository does not create a public endpoint or tunnel.

## License

The original Alatar's Graph code and project artwork are available under the [MIT License](LICENSE). The bundled Cytoscape.js 3.33.0 distribution is separately MIT licensed; its copyright and license notice are retained in [`vendor/CYTOSCAPE-LICENSE`](vendor/CYTOSCAPE-LICENSE).

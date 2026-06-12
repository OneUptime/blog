# Validation Summary: How to Build Custom Grafana Panels

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Grafana panel plugins
- Grafana Plugin Tools (`@grafana/create-plugin`, `@grafana/sign-plugin`)
- TypeScript
- React
- `@grafana/data`
- `@grafana/ui`
- Emotion CSS
- Jest and React Testing Library
- Docker Compose

## Sources Consulted
- Grafana Plugin Tools: Get started - https://grafana.com/developers/plugin-tools/
- Grafana Plugin Tools: Build a panel plugin - https://grafana.com/developers/plugin-tools/tutorials/build-a-panel-plugin
- Grafana Plugin Tools: Plugin metadata (`plugin.json`) - https://grafana.com/developers/plugin-tools/reference/plugin-json
- Grafana Plugin Tools: Add a custom panel option editor - https://grafana.com/developers/plugin-tools/how-to-guides/panel-plugins/custom-panel-option-editors
- Grafana Plugin Tools: Sign a plugin - https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin
- Grafana Plugin Tools: Package a plugin - https://grafana.com/developers/plugin-tools/publish-a-plugin/package-a-plugin
- Grafana documentation: Plugin signatures - https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-sign/
- Current `@grafana/data` package type definitions from npm (`13.0.2`)
- Current `@grafana/ui` package type definitions from npm (`13.0.2`)
- Current `@grafana/sign-plugin` package metadata from npm (`3.3.1`)

## Issues Found
- The scaffolded plugin structure showed `plugin.json` at the project root and `webpack.config.ts` as a top-level file. Current `create-plugin` projects place plugin metadata under `src/plugin.json` and include Docker Compose for the development Grafana environment. Updated the structure and metadata heading accordingly.
- The setup instructions described `npm run dev` as starting the development server. Current Grafana plugin docs use `npm run dev` to build/watch the plugin and `docker compose up` to start Grafana. Updated both setup and development build commands.
- The panel options exposed a `pie` chart type, but the example component only rendered bar and line charts. Removed `pie` from the option list and TypeScript union.
- The main panel snippet imported `cx` and destructured unused props, which can fail strict linting in scaffolded TypeScript projects. Removed the unused import and props.
- The data utility snippet imported `Field` without using it. Removed the unused import.
- The field configuration helper imported `getColorForTheme`, which is not exported by current `@grafana/data`. Replaced it with `theme.visualization.getColorByName`.
- The value formatting helper manually appended `config.unit`, which does not match Grafana's unit formatting behavior. Replaced it with `getDisplayProcessor`.
- The custom editor snippet imported removed/unused APIs (`VerticalGroup`, `HorizontalGroup`, `FieldConfigEditorProps`, `useState`) and defined an unused props interface. Replaced `VerticalGroup` with the current `Stack` component and removed unused imports/types.
- The `useFieldConfig` example used bare string keys. Updated it to use `FieldConfigProperty` enum keys from `@grafana/data`.
- The signing section suggested installing/running `@grafana/sign-plugin` directly and mixed private signing with unsigned plugin loading. Updated it to export `GRAFANA_ACCESS_POLICY_TOKEN`, use the scaffolded `npm run sign` script, and pass `--rootUrls` for private plugin signing.

## Review Notes
The article is technically relevant and broadly accurate after these fixes. The examples are still intentionally simplified; production panels should also handle loading/error states, multiple frames, null values, negative values, accessibility, and larger datasets more robustly.

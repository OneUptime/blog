# Validation Summary: How to Create Grafana Panel Plugins

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Grafana panel plugins
- Grafana Plugin Tools and create-plugin
- React
- TypeScript
- Grafana data frames and field configuration
- Docker Compose
- Grafana plugin signing

## Sources Consulted
- Grafana Plugin Tools: Build a panel plugin: https://grafana.com/developers/plugin-tools/tutorials/build-a-panel-plugin
- Grafana Plugin Tools: Read data frames returned by a data source plugin: https://grafana.com/developers/plugin-tools/how-to-guides/panel-plugins/read-data-from-a-data-source
- Grafana Plugin Tools: Data frames key concepts: https://grafana.com/developers/plugin-tools/key-concepts/data-frames
- Grafana Plugin Tools: plugin.json metadata reference: https://grafana.com/developers/plugin-tools/reference/plugin-json
- Grafana Plugin Tools: Sign a plugin: https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Installed package type declarations for @grafana/data 13.0.2 and @grafana/ui 13.0.2.

## Issues Found
- The data frame examples used `field.values.toArray()`, which is from older Vector-based Grafana data APIs. Current Grafana data frames expose `values` as arrays, so the examples now use `field.values` directly.
- The panel options example registered `alignment`, `backgroundColor`, and `animationDuration` paths without declaring matching fields or defaults in `SimpleOptions`. Added those fields and defaults so the example is internally consistent.
- The field display example used `useTheme2()` without importing it. Added the import and assigned the hook result before calling `getFieldDisplayValues`.
- The custom field configuration example used custom field paths without typing the custom field config object. Added a `CustomFieldConfig` interface and passed it as the second `PanelPlugin` generic.
- The themed panel snippet declared unused variables, which can fail stricter TypeScript or lint settings. Removed the unused `data` prop and unused color array.
- The Docker command used the legacy `docker-compose` spelling. Updated it to the current `docker compose` command used by Grafana's official plugin workflow.
- The signing section described private signatures as self-signed and referenced an API key. Grafana's current signing flow uses a Grafana Cloud Access Policy token, and private signatures must be generated for root URLs matching Grafana's `root_url`; the text and configuration snippet were corrected.
- The complete gauge example imported `ThresholdsMode` in the wrong file and used a raw string for threshold mode. Updated the module example to import and use `ThresholdsMode.Absolute`, and removed the unused component import.
- The gauge example read min, max, and thresholds from `fieldConfig.defaults`, which ignores per-field overrides for the displayed field. Updated it to read these values from the selected `FieldDisplay.field`.

## Review Notes
The post targets Grafana 10.x+, while the latest checked npm packages were @grafana/data 13.0.2 and @grafana/create-plugin 7.8.0. The corrected examples align with the current data-frame API and remain compatible with the Grafana 10+ plugin model described in the post.

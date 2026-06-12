# Validation Summary: How to Implement Keycloak Custom Themes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Keycloak themes
- FreeMarker templates
- CSS and PatternFly
- Keycloak email templates
- Docker Compose
- Dockerfile-based Keycloak images
- Keycloak CLI startup options

## Sources Consulted
- Keycloak official theme customization guide: https://www.keycloak.org/ui-customization/themes
- Keycloak theme guide source: https://github.com/keycloak/keycloak/blob/main/docs/guides/ui-customization/themes.adoc
- Keycloak current base login template: https://github.com/keycloak/keycloak/blob/main/themes/src/main/resources/theme/base/login/login.ftl
- Keycloak current v2 login template: https://github.com/keycloak/keycloak/blob/main/themes/src/main/resources/theme/keycloak.v2/login/login.ftl
- Keycloak current v2 login theme properties: https://github.com/keycloak/keycloak/blob/main/themes/src/main/resources/theme/keycloak.v2/login/theme.properties
- Keycloak current email template layout: https://github.com/keycloak/keycloak/blob/main/themes/src/main/resources/theme/base/email/html/template.ftl
- Keycloak 26 release notes for the default v2 login theme: https://www.keycloak.org/2024/10/keycloak-2600-released

## Issues Found
- The login theme example extended `parent=keycloak`, which is the legacy v1 login theme in current Keycloak releases. Changed it to `parent=keycloak.v2`.
- The `theme.properties` example defined `styles` twice, causing the first value to be overwritten, and referenced `css/tile.css`, which is not part of the current v2 login theme stylesheet set. Replaced it with `styles=css/styles.css css/custom.css`.
- The `scripts=js/custom.js` line was active even though the post did not create that file. Commented it out and added the `resources/js` directory to the setup command for readers who choose to add scripts.
- Several CSS selectors and variables targeted the older PatternFly 4 login theme or the submit button instead of the login panel. Updated them to current PatternFly 5 selectors and variables used by `keycloak.v2`.
- The custom `login.ftl` example was based on the older login template and omitted current v2 helpers for field rendering, buttons, social providers, password handling, and passkey conditional UI. Updated the example to use the current v2 imports and macros.
- The login template inserted block-level header markup into a section rendered inside the page title element. Changed the header section to output title text only.
- The email theme section created templates without showing the required `email/theme.properties`. Added `parent=keycloak`.
- The email logo example used a custom `properties.logoUrl` value that was never defined. Updated it to use `${url.resourcesUrl}/img/logo.png`, matching Keycloak guidance that email images need absolute resource URLs, and added the email image resource directory to the theme structure.
- The development command used the wrong current SPI option spelling for theme cache settings. Updated it to `--spi-theme--static-max-age`, `--spi-theme--cache-themes`, and `--spi-theme--cache-templates`.
- The development tip heading said to enable theme caching while the instruction and command disabled it. Corrected the heading.

## Review Notes
The Docker examples are technically usable, but using `quay.io/keycloak/keycloak:latest` is not ideal for production because it makes upgrades implicit. A pinned Keycloak image tag would be a good future improvement, but it was not changed because the post does not target a specific Keycloak version.

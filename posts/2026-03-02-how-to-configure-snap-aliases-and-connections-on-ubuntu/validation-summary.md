# Validation Summary: How to Configure Snap Aliases and Connections on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Snap and snapd
- Snap aliases
- Snap interfaces, plugs, slots, and connections
- Bash shell scripting

## Sources Consulted
- Snapcraft documentation: Apps and aliases - https://snapcraft.io/docs/how-to-guides/manage-snaps/apps-and-aliases/
- Snapcraft documentation: Connect interfaces - https://snapcraft.io/docs/how-to-guides/manage-snaps/connect-interfaces/
- Snapcraft documentation: Interfaces reference - https://snapcraft.io/docs/reference/interfaces/
- Snapcraft documentation: Deprecation notice for snap aliases in snap metadata - https://snapcraft.io/docs/deprecation-notice-5
- Local snapd CLI help for snapd 2.75.2: `snap help aliases`, `snap help alias`, `snap help unalias`, `snap help connections`, `snap help interface`, `snap help connect`, and `snap help disconnect`

## Issues Found
- The post said automatic aliases are declared in `snapcraft.yaml`. Snap aliases are handled by the Snap Store after review, so the text now says automatic aliases are requested by the developer and enabled after Snap Store review.
- The command namespace explanation used an inaccurate `hello-world.hello` example. It now describes the current `<snap>` and `<snap>.<application>` command forms and uses Firefox examples.
- The Firefox manual alias examples used `firefox.firefox`, but Firefox's main command is `firefox`; examples now use the valid `firefox.geckodriver` command.
- The alias notes examples and `grep auto` command implied automatic aliases are marked as `auto`. Current Snapcraft examples show reviewed/default aliases with `-`, manual aliases as `manual`, and disabled aliases as `disabled`; the example was corrected.
- The conflict-resolution examples used `snap alias` and `snap unalias` where `snap prefer` is the documented way to prefer one snap's reviewed aliases over another snap's conflicting aliases.
- The interface listing section used `snap interface` for all available interfaces and `snap connections --interface camera`, but current snapd uses `snap interface --all` for all interfaces and does not document a `snap connections --interface` flag. These commands were corrected.
- The disconnect section showed `sudo snap disconnect firefox`, which is not a valid current command form. It now only shows disconnecting a specific plug and explains the remembered disconnect behavior for automatic connections.
- The scripting example passed `firefox:camera` to `snap connections`, but that command accepts a snap name, not a `snap:plug` reference. The helper now extracts the snap name and checks for the exact plug/slot pair with `awk`.

## Review Notes
Some interface auto-connections can vary by interface attributes, snap declaration, and store-granted permissions. The post now reflects that nuance, but readers should still verify the exact connections on their installed snap with `snap connections <snap>`.

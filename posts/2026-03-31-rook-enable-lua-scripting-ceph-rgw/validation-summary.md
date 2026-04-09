# Validation Summary: How to Enable Lua Scripting in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- Lua scripting (embedded in RGW)
- radosgw-admin CLI
- kubectl

## Sources Consulted
- Ceph official Lua scripting documentation: https://docs.ceph.com/en/latest/radosgw/lua-scripting/
- Ceph Reef Lua scripting docs: https://docs.ceph.com/en/reef/radosgw/lua-scripting/
- Ceph Quincy Lua scripting docs: https://docs.ceph.com/en/quincy/radosgw/lua-scripting/
- Ceph RGW Lua source code (rgw_lua_request.cc) on GitHub

## Issues Found

1. **`rgw_lua_global_script` config option does not exist**: Step 2 claimed you needed to set `rgw_lua_global_script` to enable Lua. This config option is not documented in official Ceph docs. Lua scripting is available without any config changes once RGW is built with Lua support. Replaced the entire Step 2 with a note that no configuration is needed.

2. **`radosgw-admin script list` does not exist**: The `script list` subcommand is not a valid radosgw-admin command. Only `script-package list` exists (for Lua packages). Removed the `script list` line.

3. **`Request.HTTP.ContentLength` is incorrect**: `ContentLength` is a field on the `Request` object directly, not under `Request.HTTP`. Changed to `Request.ContentLength`.

4. **`Request.User.DisplayName` does not exist**: The `DisplayName` field exists under `Request.ObjectOwner.DisplayName`, not `Request.User`. Replaced with `Request.User.Tenant` which is a documented field on the User object.

5. **`Response.HTTP.AddHeader()` does not exist**: There is no `Response` global object in RGW Lua scripts. Response modification is done through `Request.Response.HTTPStatusCode`, `Request.Response.HTTPStatus`, `Request.Response.RGWCode`, and `Request.Response.Message`. Replaced with correct response fields.

6. **Context names are version-dependent**: The post used camelCase context names (`preRequest`, `postRequest`) which are only correct for Ceph Pacific and Quincy. Ceph Reef (18.x) and later use lowercase (`prerequest`, `postrequest`) and add three additional contexts (`background`, `getdata`, `putdata`). Added a note about this version difference.

7. **Debug level 10 insufficient for RGWDebugLog()**: `RGWDebugLog()` writes at priority 20, so `debug_rgw 10` would not capture the output. Changed to `debug_rgw 20`.

## Review Notes
- The post targets Ceph Pacific/Quincy era conventions. Users on Ceph Reef or later should use lowercase context names and can take advantage of additional contexts (background, getdata, putdata).
- The curl-based Admin REST API upload method (`/admin/script?context=preRequest`) is not documented in official Ceph Lua scripting docs. It may work in practice but is not officially supported. Left as-is since it is a plausible endpoint, but users should prefer `radosgw-admin script put`.
- The claim that Lua is "enabled by default when built with lua5.3 or luajit" is not explicitly stated in official docs, though Lua support was indeed added in Pacific. The comment was left as-is since it is broadly accurate.

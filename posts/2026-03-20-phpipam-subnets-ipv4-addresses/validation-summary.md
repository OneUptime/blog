# Validation Summary: How to Create Subnets and Assign IPv4 Addresses in phpIPAM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- phpIPAM
- phpIPAM REST API
- IPv4 subnetting
- `curl`
- Python `json` parsing from the command line

## Sources Consulted
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM API documentation in the official repository: https://github.com/phpipam/phpipam/blob/master/doc/API/api_documentation.md
- phpIPAM curl API examples: https://github.com/phpipam/phpipam/blob/master/doc/API/api_curl_example.md
- phpIPAM `Subnets` API controller: https://github.com/phpipam/phpipam/blob/master/api/controllers/Subnets.php
- phpIPAM `Addresses` API controller: https://github.com/phpipam/phpipam/blob/master/api/controllers/Addresses.php
- phpIPAM subnet usage calculation: https://github.com/phpipam/phpipam/blob/master/functions/classes/class.Subnets.php

## Issues Found
- The parent subnet creation example set `isFolder` to `1` while also providing `subnet` and `mask`. In phpIPAM, `isFolder=1` creates a folder, and the controller drops `subnet` and `mask` for folders. I removed `isFolder` so the example actually creates `10.100.0.0/16` as a subnet and can be found by the later search call.
- The `subnets/search/{subnet}/` API returns `data` as an array of matching subnets, not a single object. I updated both Python extraction commands from `['data']['id']` to `['data'][0]['id']`.
- The address creation example used `state` in the request body. The official API documentation exposes the address tag field as `tag`, and the controller maps that public parameter correctly. I changed the example to use `tag`.
- The subnet usage note said the response returns `used, free, maxhosts, percent`. The current implementation returns keys such as `used`, `freehosts`, `maxhosts`, `Used_percent`, and `freehosts_percent`, plus tag-specific counters. I corrected the note.
- The closing sentence referred to "first-free IP allocation", but the example shown in that section uses `GET /subnets/{id}/first_free/`, which looks up the next free address rather than allocating it. I changed the wording to "first-free IP lookup".

## Review Notes
- The post is technically valid after the fixes above.
- For automation workflows that need to reserve the next free address atomically, phpIPAM also provides `POST /api/{app_id}/addresses/first_free/{subnetId}/`, which is separate from the `GET /subnets/{id}/first_free/` lookup shown in the post.

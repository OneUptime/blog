# Validation Summary: How to Document an IPv4 Address Plan with IPAM Tools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NetBox
- NetBox Docker (`netbox-docker`)
- NetBox REST API
- Python `requests`
- Docker Compose
- phpIPAM
- MariaDB
- IPv4
- IPAM

## Sources Consulted
- NetBox Docker README: https://github.com/netbox-community/netbox-docker
- NetBox prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox prefix serializer source: https://github.com/netbox-community/netbox/blob/master/netbox/ipam/api/serializers_/ip.py
- NetBox available prefixes view source: https://github.com/netbox-community/netbox/blob/master/netbox/ipam/api/views.py
- phpipam-docker README: https://github.com/phpipam-docker/phpipam-docker
- phpIPAM installation documentation: https://www2.phpipam.net/documents/installation/
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM project README: https://github.com/phpipam/phpipam

## Issues Found
- The NetBox Docker installation steps were outdated. The original snippet cloned the default branch, referenced `env/netbox.env.example`, used port `8080`, and claimed default `admin / admin` credentials. I updated the post to match the current `netbox-docker` quickstart: clone the `release` branch, copy `docker-compose.override.yml.example`, expose NetBox on port `8000`, and create the first superuser explicitly.
- The NetBox API examples used outdated prefix field semantics. The original code used a `site` field, but current NetBox documentation defines `scope` as the replacement for prefix site assignment and the serializer exposes `scope_type` and `scope_id`. I updated the examples to use the current field model.
- The NetBox API examples used `http://localhost:8080` and legacy-style token headers. I updated them to `http://localhost:8000` and a current Bearer token example matching the documented v2 token format.
- The prefix detail helper expected a `utilization` field in the prefix REST response. Current prefix serialization documents fields such as `status`, `children`, and `_depth`, but not a guaranteed `utilization` field in the serialized object. I rewrote the helper to return documented fields.
- The CSV import example documented `site` and `vlan` columns but did not implement them. I corrected the documented CSV format and import logic to support optional `scope_type` and `scope_id` columns instead.
- The available-subnets example did not actually use `desired_prefix_length` correctly and printed the address family as though it were subnet size. I replaced it with a version that queries NetBox for available gaps and derives candidate child prefixes of the requested length.
- The phpIPAM Docker example was incomplete. Running only `phpipam/phpipam-www` with `MYSQL_ROOT_PASSWORD` does not match the documented deployment model. I replaced it with a compose-based stack using `phpipam-www`, `phpipam-cron`, and `mariadb`, and clarified that API endpoints are available after configuring an API app.

## Review Notes
- NetBox documentation currently contains some older examples that still reference `site` in prefix payloads, but the current prefix model documentation states that `scope` replaced `site` in NetBox v4.2. The post now uses the current model.
- The phpIPAM Docker images are community maintained, although they are the deployment path referenced from the phpIPAM project README and Docker documentation.

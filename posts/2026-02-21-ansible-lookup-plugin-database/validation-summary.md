# Validation Summary: How to Create a Lookup Plugin that Reads from a Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible lookup plugins
- Ansible playbooks and Jinja lookup/query functions
- Python
- PostgreSQL
- psycopg2
- MySQL Connector/Python
- SQL parameterized queries

## Sources Consulted
- Ansible lookup documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible plugin development documentation: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html
- psycopg2 connection API documentation: https://www.psycopg.org/docs/module.html
- psycopg2 cursor API documentation: https://www.psycopg.org/docs/cursor.html
- psycopg2 RealDictCursor documentation: https://www.psycopg.org/docs/extras.html
- MySQL Connector/Python cursor documentation: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlconnection-cursor.html
- MySQL Connector/Python execute documentation: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-execute.html

## Issues Found
- The PostgreSQL plugin implementation returned a nested list for normal row results by appending each query's row list to `results`, while the documentation and playbook examples described a flat list of row dictionaries. Changed `results.append([dict(row) for row in rows])` to `results.extend([dict(row) for row in rows])`.
- The basic playbook example looped over `targets[0]`, which matched the old nested return shape but would not match the documented flat list. Changed the lookup call to `query(...)` for list-preserving behavior and changed the loop to `loop: "{{ targets }}"`.
- The list-return examples used `lookup(...)` where `query(...)` is the clearer Ansible API for preserving list results. Updated the web server and parameterized query examples to use `query(...)`.
- The MySQL variant had the same nested-list return behavior as the PostgreSQL example. Changed `results.append(rows)` to `results.extend(rows)`.

## Review Notes
The main PostgreSQL Python code block was syntax-checked with Python 3. The MySQL block is presented as a variant showing the database-specific changes rather than a complete standalone file, because it relies on the imports and documentation structure shown in the PostgreSQL plugin.

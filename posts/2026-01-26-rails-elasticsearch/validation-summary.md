# Validation Summary: How to Use Rails with Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby on Rails
- Searchkick
- Elasticsearch
- Elasticsearch Ruby client
- Docker
- Homebrew
- Sidekiq
- Redis
- RSpec
- Stimulus

## Sources Consulted
- Searchkick official README: https://github.com/ankane/searchkick
- Searchkick source code: https://github.com/ankane/searchkick/blob/master/lib/searchkick/index.rb
- Elastic Homebrew tap README: https://github.com/elastic/homebrew-tap
- Elastic Docker installation docs: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic
- Elasticsearch Ruby client advanced configuration docs: https://www.elastic.co/docs/reference/elasticsearch/clients/ruby/advanced-config

## Issues Found
- The Homebrew install command used `brew install elasticsearch`, which is not the current Elastic tap command. Updated it to tap `elastic/tap`, install `elastic/tap/elasticsearch-full`, and start that service.
- The Docker example used the unqualified `elasticsearch:8.11.0` image. Updated it to the official Elastic registry image and added a container memory limit.
- The Gemfile omitted the Elasticsearch Ruby client required by current Searchkick, and later snippets used Redis and Typhoeus without listing the gems. Added `elasticsearch`, `redis`, and `typhoeus`.
- The field boosting example used an unsupported hash shape with `boost:` keys. Updated it to Searchkick's supported boosted field syntax.
- The OR filter used `or`; Searchkick documents `_or`. Updated the filter key.
- The autocomplete example used older option style for `fields`, `match`, `limit`, and `load`. Updated it to the current Searchkick query builder style.
- The highlighting example omitted `searchkick highlight:` on the model and used an outdated option structure. Added the model configuration and updated the search call to use `.highlight`.
- The async reindex example used `Product.reindex(async: true)` and implied automatic alias promotion. Updated it to `Product.reindex(mode: :async)`, tracking the returned index name, checking status, and promoting the index explicitly.
- Test and troubleshooting snippets used `searchkick_index`; current documentation uses `search_index`. Updated those references.
- The production client configuration used a stale `Searchkick.client_options` hash with `request_timeout` and `adapter: :typhoeus`. Updated it to current retry and timeout configuration.
- The "check if record is in index" snippet called `exists?` with a record, but `exists?` checks whether the index exists. Updated it to retrieve the indexed source for the record.
- The debugging snippet used `Product.search("laptop", debug: true)`, while current Searchkick uses `.debug`. Updated the call.

## Review Notes
The post is technically relevant and valid after the fixes. Searchkick 6 still supports the older options API, but the updated examples use the current query builder where the original snippets were wrong or misleading.

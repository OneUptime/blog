# Validation Summary: How to Use Phoenix LiveView for Real-Time UIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Phoenix Framework
- Phoenix LiveView
- Elixir
- HEEx templates
- Phoenix PubSub
- LiveComponents
- LiveView forms and validation
- LiveView async assigns and streams
- JavaScript hooks
- Kubernetes session affinity

## Sources Consulted
- Phoenix.LiveView official docs: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html
- Phoenix LiveView JavaScript interoperability docs: https://hexdocs.pm/phoenix_live_view/js-interop.html
- Phoenix LiveView form bindings docs: https://hexdocs.pm/phoenix_live_view/form-bindings.html
- Phoenix LiveView changelog: https://hexdocs.pm/phoenix_live_view/changelog.html
- Phoenix `mix phx.new` docs: https://hexdocs.pm/phoenix/Mix.Tasks.Phx.New.html
- Phoenix `mix phx.gen.live` docs: https://hexdocs.pm/phoenix/Mix.Tasks.Phx.Gen.Live.html
- Phoenix deployment docs: https://hexdocs.pm/phoenix/deployment.html
- Phoenix.PubSub official docs: https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.html
- Phoenix.PubSub.PG2 official docs: https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.PG2.html
- Kubernetes Service session affinity docs: https://kubernetes.io/docs/reference/networking/virtual-ips/#session-affinity

## Issues Found
- The setup code block mixed a shell command with an Elixir dependency tuple in a `bash` fence. I split the examples into separate `bash` and `elixir` fences so the snippets are syntactically accurate.
- The LiveView dependency example used `{:phoenix_live_view, "~> 0.20"}`, which is outdated for a 2026 article. I updated it to `{:phoenix_live_view, "~> 1.2"}` to match the current LiveView 1.2 series.
- The setup text said to run an installer, but the shown command was only `mix deps.get`. I changed the wording to say the dependency should be fetched with Mix.
- The form example used `phx-change` without a form `id`. Current LiveView test checks warn for forms with `phx-change` and no `id`, so I added `id="registration-form"`.
- The deployment section stated that WebSockets require sticky sessions for multiple server instances. Phoenix's deployment guidance is more specific: WebSockets are long-lived connections, while long-polling fallback across instances requires clustering, a distributed PubSub adapter, or sticky sessions. I corrected the wording.
- The PubSub deployment snippet configured `MyApp.PubSub` in `runtime.exs`, but Phoenix.PubSub is started as a supervised child with options such as `name` and optional `adapter`. I replaced it with a child spec example and separated it from the endpoint runtime configuration.
- The Kubernetes session affinity example was presented as a general WebSocket requirement. I narrowed the wording to long-polling fallback scenarios without clustering or a distributed PubSub adapter.

## Review Notes
The remaining code examples align with the documented LiveView APIs: `mount/3`, `render/1`, `handle_event/3`, `handle_info/2`, `connected?/1`, `assign_async/3`, `<.async_result>`, streams, `push_event/3`, client hooks, and PubSub subscribe/broadcast. The examples are illustrative and assume app-specific modules such as `Accounts`, `Metrics`, `Products`, and `Reports` exist.

# Validation Summary: How to Use Hotwire/Turbo for Modern Rails Apps

## Status
validated

## Post Type
Tutorial / Guide — a practical, code-heavy walkthrough of building reactive Rails apps with Hotwire (Turbo Drive, Turbo Frames, Turbo Streams, and Stimulus).

## Technologies Covered
- Ruby on Rails 7+
- Hotwire
- Turbo (Turbo Drive, Turbo Frames, Turbo Streams)
- Stimulus
- Action Cable (Turbo Stream broadcasting)
- Importmap / esbuild asset pipeline
- Minitest (system tests, controller tests) and Stimulus JS unit tests

## Sources Consulted
- Turbo Handbook & Reference — https://turbo.hotwired.dev/ (Drive reference: https://turbo.hotwired.dev/reference/drive)
- Turbo Streams reference — https://turbo.hotwired.dev/reference/streams
- Stimulus Handbook & Reference — https://stimulus.hotwired.dev/
- turbo-rails gem (broadcasting helpers, `turbo_stream_from`, `turbo_frame_tag`, `Turbo::StreamsChannel`) — https://github.com/hotwired/turbo-rails
- Hotwire overview — https://hotwired.dev/
- Rails Guides: Working with JavaScript in Rails (Hotwire) — https://guides.rubyonrails.org/working_with_javascript_in_rails.html

## Issues Found
1. **Intro miscount of Hotwire's component technologies (line 13).** The text stated Hotwire "consists of three key technologies: Turbo Drive, Turbo Frames, Turbo Streams, and Stimulus" — a count of "three" followed by a list of four items, and a structural mischaracterization. Hotwire is composed of two complementary technologies: Turbo (which itself provides Turbo Drive, Turbo Frames, and Turbo Streams) and Stimulus. **Fix:** reworded to "It consists of two complementary technologies: Turbo (which provides Turbo Drive, Turbo Frames, and Turbo Streams) and Stimulus for JavaScript sprinkles." No other content changed.

## Review Notes
- **`Turbo.config.drive.progressBarDelay = 100` (line 206)** is correct and current. This is the Turbo 8 API; it replaced the now-deprecated top-level `Turbo.setProgressBarDelay()`. Default delay is 500ms, matching the post's comment. Verified against the Turbo Drive reference.
- **Turbo 8 morphing meta tags** (`turbo-refresh-method: morph`, `turbo-refresh-scroll: preserve`) are accurate.
- **Custom Stream Actions** (`import { StreamActions } from "@hotwired/turbo"`, `Turbo.visit`) are accurate.
- **Broadcasting helpers** (`broadcast_append_to`, `broadcast_replace_to`, `broadcast_remove_to`, `Turbo::StreamsChannel.broadcast_*_to`, `turbo_stream_from`) and the matching of the `[user, :tasks]` stream name between the model broadcast and the view subscription are correct.
- **Controller test assertion** `assert_equal "text/vnd.turbo-stream.html; charset=utf-8", response.content_type` is correct for Rails 6.1+/7, where `response.content_type` includes the charset parameter (`response.media_type` is the parameter-less form).
- Minor code-quality observation (not a technical error, left as-is): in `_task.html.erb` the `turbo_frame_tag task` wrapper and the inner `<div id="<%= dom_id(task) %>">` both resolve to the same DOM id (`task_<id>`), and similarly `new_task_form` is used both as a wrapping `<div>` id and as the form id. Browsers tolerate this (first match wins) and the examples function as described, but using distinct ids would be cleaner. This does not affect correctness of the tutorial's behavior.

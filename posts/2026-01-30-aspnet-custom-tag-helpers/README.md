# How to Create Custom Tag Helpers in Razor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, ASP.NET, Razor, Web Development

Description: Build custom tag helpers in ASP.NET Core Razor for reusable HTML components, conditional rendering, and server-side logic in views.

---

Tag helpers in ASP.NET Core let you write server-side code that participates in rendering HTML elements in Razor views. Unlike HTML helpers, tag helpers look like standard HTML, making your views cleaner and easier to maintain. This guide walks through building custom tag helpers from scratch.

## Understanding the TagHelper Base Class

Every custom tag helper inherits from `TagHelper`. This base class provides two virtual methods you can override: `Process` and `ProcessAsync`. The synchronous version works for simple scenarios, while the async version handles operations that require awaiting.

Here is the minimal structure for a custom tag helper:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    // The class name determines the tag name by convention
    // "AlertTagHelper" becomes <alert> in Razor views
    public class AlertTagHelper : TagHelper
    {
        // Process runs when the tag is rendered
        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            // Transform the output here
        }
    }
}
```

The `TagHelperContext` provides information about the tag being processed, including its attributes and a unique identifier. The `TagHelperOutput` represents what gets rendered to the page, and you modify it to control the final HTML.

## The HtmlTargetElement Attribute

By default, ASP.NET Core derives the target element name from your class name by removing the "TagHelper" suffix and converting to kebab-case. The `HtmlTargetElement` attribute gives you explicit control over targeting.

This table shows the different targeting options:

| Attribute Usage | Targets |
|----------------|---------|
| `[HtmlTargetElement("alert")]` | `<alert>` elements |
| `[HtmlTargetElement("div", Attributes = "alert-type")]` | `<div alert-type="...">` |
| `[HtmlTargetElement("*", Attributes = "tooltip")]` | Any element with `tooltip` attribute |
| `[HtmlTargetElement("button", ParentTag = "form")]` | `<button>` only inside `<form>` |

You can apply multiple `HtmlTargetElement` attributes to target several elements with one tag helper:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    // This tag helper targets both <alert> and <notification> elements
    [HtmlTargetElement("alert")]
    [HtmlTargetElement("notification")]
    public class AlertTagHelper : TagHelper
    {
        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            // Set the actual HTML element that gets rendered
            output.TagName = "div";

            // Add a CSS class to the output
            output.Attributes.SetAttribute("class", "alert-box");
        }
    }
}
```

## Manipulating TagHelperOutput

The `TagHelperOutput` object is your primary tool for controlling rendered HTML. It exposes properties for the tag name, attributes, and content sections.

### Setting Tag Name and Attributes

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("card")]
    public class CardTagHelper : TagHelper
    {
        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            // Change the tag from <card> to <div>
            output.TagName = "div";

            // Add multiple attributes
            output.Attributes.SetAttribute("class", "card shadow-sm");
            output.Attributes.SetAttribute("role", "article");

            // Add data attributes
            output.Attributes.SetAttribute("data-component", "card");
        }
    }
}
```

### Adding Content Before and After

The output object has `PreElement`, `PreContent`, `PostContent`, and `PostElement` properties for injecting HTML at different positions:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("panel")]
    public class PanelTagHelper : TagHelper
    {
        // Bound attribute for the panel title
        public string Title { get; set; }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "div";
            output.Attributes.SetAttribute("class", "panel");

            // PreElement: HTML rendered before the opening tag
            output.PreElement.SetHtmlContent("<!-- Panel Start -->\n");

            // PreContent: HTML rendered after opening tag, before content
            if (!string.IsNullOrEmpty(Title))
            {
                output.PreContent.SetHtmlContent(
                    $"<div class=\"panel-header\"><h3>{Title}</h3></div>\n" +
                    "<div class=\"panel-body\">"
                );
            }

            // PostContent: HTML rendered after content, before closing tag
            if (!string.IsNullOrEmpty(Title))
            {
                output.PostContent.SetHtmlContent("</div>");
            }

            // PostElement: HTML rendered after the closing tag
            output.PostElement.SetHtmlContent("\n<!-- Panel End -->");
        }
    }
}
```

Usage in Razor:

```html
<panel title="User Settings">
    <p>Configure your preferences here.</p>
</panel>
```

Rendered output:

```html
<!-- Panel Start -->
<div class="panel">
    <div class="panel-header"><h3>User Settings</h3></div>
    <div class="panel-body">
        <p>Configure your preferences here.</p>
    </div>
</div>
<!-- Panel End -->
```

### Suppressing Output

Sometimes you want to prevent an element from rendering based on a condition:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("feature-flag")]
    public class FeatureFlagTagHelper : TagHelper
    {
        public string Flag { get; set; }

        // Inject your feature flag service
        private readonly IFeatureFlagService _featureFlags;

        public FeatureFlagTagHelper(IFeatureFlagService featureFlags)
        {
            _featureFlags = featureFlags;
        }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            // Check if the feature is enabled
            if (!_featureFlags.IsEnabled(Flag))
            {
                // Suppress all output, renders nothing
                output.SuppressOutput();
                return;
            }

            // Feature is enabled, remove the wrapper tag but keep content
            output.TagName = null;
        }
    }
}
```

## Processing Child Content

To work with the content inside your tag, use `GetChildContentAsync()`. This retrieves whatever markup exists between the opening and closing tags.

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using System.Threading.Tasks;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("markdown")]
    public class MarkdownTagHelper : TagHelper
    {
        private readonly IMarkdownService _markdown;

        public MarkdownTagHelper(IMarkdownService markdown)
        {
            _markdown = markdown;
        }

        public override async Task ProcessAsync(
            TagHelperContext context,
            TagHelperOutput output)
        {
            // Get the child content as a string
            var childContent = await output.GetChildContentAsync();
            var markdownText = childContent.GetContent();

            // Convert markdown to HTML
            var htmlContent = _markdown.ToHtml(markdownText);

            // Replace the tag with a div containing the converted HTML
            output.TagName = "div";
            output.Attributes.SetAttribute("class", "markdown-content");

            // Set the content (use SetHtmlContent for raw HTML)
            output.Content.SetHtmlContent(htmlContent);
        }
    }
}
```

### Controlling Content Encoding

The difference between `SetContent` and `SetHtmlContent` is critical:

| Method | Behavior |
|--------|----------|
| `SetContent(string)` | HTML-encodes the string (safe from XSS) |
| `SetHtmlContent(string)` | Renders raw HTML (use only with trusted content) |
| `SetHtmlContent(IHtmlContent)` | Renders pre-built HTML content |

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.AspNetCore.Html;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("safe-html")]
    public class SafeHtmlTagHelper : TagHelper
    {
        public string Text { get; set; }
        public string Html { get; set; }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "div";

            if (!string.IsNullOrEmpty(Text))
            {
                // This encodes the text, <script> becomes &lt;script&gt;
                output.Content.SetContent(Text);
            }
            else if (!string.IsNullOrEmpty(Html))
            {
                // This renders raw HTML, only use with sanitized content
                output.Content.SetHtmlContent(Html);
            }
        }
    }
}
```

## Bound Attributes

Bound attributes map HTML attributes to C# properties on your tag helper. ASP.NET Core handles the conversion automatically for common types.

### Basic Attribute Binding

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("progress-bar")]
    public class ProgressBarTagHelper : TagHelper
    {
        // Simple string attribute
        public string Label { get; set; }

        // Integer attribute with automatic parsing
        public int Value { get; set; }

        // Integer with default value
        public int Max { get; set; } = 100;

        // Boolean attribute
        public bool Striped { get; set; }

        // Enum attribute
        public ProgressColor Color { get; set; } = ProgressColor.Primary;

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "div";
            output.Attributes.SetAttribute("class", "progress");

            var percentage = (Value * 100) / Max;
            var stripedClass = Striped ? " progress-bar-striped" : "";
            var colorClass = $"bg-{Color.ToString().ToLower()}";

            output.Content.SetHtmlContent(
                $"<div class=\"progress-bar {colorClass}{stripedClass}\" " +
                $"role=\"progressbar\" style=\"width: {percentage}%\" " +
                $"aria-valuenow=\"{Value}\" aria-valuemin=\"0\" aria-valuemax=\"{Max}\">" +
                $"{Label}" +
                "</div>"
            );
        }
    }

    public enum ProgressColor
    {
        Primary,
        Success,
        Warning,
        Danger
    }
}
```

Usage:

```html
<progress-bar value="75" max="100" label="75% Complete" color="Success" striped="true" />
```

### The HtmlAttributeName Attribute

Use `HtmlAttributeName` when you want the HTML attribute name to differ from the C# property name:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("icon")]
    public class IconTagHelper : TagHelper
    {
        // Maps "icon-name" attribute to Name property
        [HtmlAttributeName("icon-name")]
        public string Name { get; set; }

        // Maps "icon-size" attribute to Size property
        [HtmlAttributeName("icon-size")]
        public IconSize Size { get; set; } = IconSize.Medium;

        // Maps "spin" attribute (no prefix needed for simple names)
        public bool Spin { get; set; }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "i";

            var sizeClass = Size switch
            {
                IconSize.Small => "icon-sm",
                IconSize.Large => "icon-lg",
                _ => ""
            };

            var spinClass = Spin ? "icon-spin" : "";

            output.Attributes.SetAttribute(
                "class",
                $"icon icon-{Name} {sizeClass} {spinClass}".Trim()
            );
        }
    }

    public enum IconSize
    {
        Small,
        Medium,
        Large
    }
}
```

Usage:

```html
<icon icon-name="settings" icon-size="Large" spin="true" />
```

### Model Binding with ModelExpression

For attributes that bind to model properties (like the built-in `asp-for`), use `ModelExpression`:

```csharp
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("form-field")]
    public class FormFieldTagHelper : TagHelper
    {
        // This allows asp-for style binding
        [HtmlAttributeName("asp-for")]
        public ModelExpression For { get; set; }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "div";
            output.Attributes.SetAttribute("class", "form-group");

            // Get metadata about the bound property
            var propertyName = For.Name;
            var displayName = For.Metadata.DisplayName ?? For.Name;
            var value = For.Model?.ToString() ?? "";
            var inputType = GetInputType(For.Metadata.ModelType);

            output.Content.SetHtmlContent(
                $"<label for=\"{propertyName}\">{displayName}</label>\n" +
                $"<input type=\"{inputType}\" id=\"{propertyName}\" " +
                $"name=\"{propertyName}\" value=\"{value}\" class=\"form-control\" />"
            );
        }

        private string GetInputType(Type type)
        {
            if (type == typeof(int) || type == typeof(decimal) || type == typeof(double))
                return "number";
            if (type == typeof(DateTime))
                return "date";
            if (type == typeof(bool))
                return "checkbox";
            return "text";
        }
    }
}
```

## Async Tag Helpers

The async pattern is essential when your tag helper needs to perform I/O operations, call external services, or access databases.

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using System.Net.Http;
using System.Threading.Tasks;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("github-repo")]
    public class GitHubRepoTagHelper : TagHelper
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public string Owner { get; set; }
        public string Repo { get; set; }

        public GitHubRepoTagHelper(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public override async Task ProcessAsync(
            TagHelperContext context,
            TagHelperOutput output)
        {
            output.TagName = "div";
            output.Attributes.SetAttribute("class", "github-repo-card");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("User-Agent", "MyApp");

                var response = await client.GetAsync(
                    $"https://api.github.com/repos/{Owner}/{Repo}"
                );

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var repo = System.Text.Json.JsonSerializer.Deserialize<GitHubRepoInfo>(
                        json,
                        new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        }
                    );

                    output.Content.SetHtmlContent(
                        $"<h4><a href=\"{repo.HtmlUrl}\">{repo.FullName}</a></h4>" +
                        $"<p>{repo.Description}</p>" +
                        $"<div class=\"repo-stats\">" +
                        $"<span>Stars: {repo.StargazersCount}</span> | " +
                        $"<span>Forks: {repo.ForksCount}</span>" +
                        $"</div>"
                    );
                }
                else
                {
                    output.Content.SetHtmlContent(
                        "<p class=\"error\">Could not load repository information.</p>"
                    );
                }
            }
            catch (HttpRequestException)
            {
                output.Content.SetHtmlContent(
                    "<p class=\"error\">Failed to connect to GitHub API.</p>"
                );
            }
        }
    }

    public class GitHubRepoInfo
    {
        public string FullName { get; set; }
        public string Description { get; set; }
        public string HtmlUrl { get; set; }
        public int StargazersCount { get; set; }
        public int ForksCount { get; set; }
    }
}
```

### Caching Async Results

For expensive operations, combine async tag helpers with caching:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Threading.Tasks;

namespace MyApp.TagHelpers
{
    [HtmlTargetElement("cached-content")]
    public class CachedContentTagHelper : TagHelper
    {
        private readonly IMemoryCache _cache;
        private readonly IContentService _contentService;

        [HtmlAttributeName("cache-key")]
        public string CacheKey { get; set; }

        [HtmlAttributeName("cache-duration")]
        public int CacheDurationMinutes { get; set; } = 5;

        public CachedContentTagHelper(
            IMemoryCache cache,
            IContentService contentService)
        {
            _cache = cache;
            _contentService = contentService;
        }

        public override async Task ProcessAsync(
            TagHelperContext context,
            TagHelperOutput output)
        {
            output.TagName = null; // Remove wrapper tag

            // Try to get from cache
            if (!_cache.TryGetValue(CacheKey, out string cachedContent))
            {
                // Not in cache, fetch and store
                cachedContent = await _contentService.GetContentAsync(CacheKey);

                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(CacheDurationMinutes));

                _cache.Set(CacheKey, cachedContent, cacheOptions);
            }

            output.Content.SetHtmlContent(cachedContent);
        }
    }
}
```

## Tag Helper Components

Tag helper components let you inject content into pages globally without modifying individual views. They are useful for adding scripts, styles, or meta tags across your entire application.

### Creating a Tag Helper Component

```csharp
using Microsoft.AspNetCore.Mvc.Razor.TagHelpers;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace MyApp.TagHelpers
{
    // Target the <head> element
    public class AnalyticsTagHelperComponent : TagHelperComponent
    {
        private readonly IConfiguration _config;

        public AnalyticsTagHelperComponent(IConfiguration config)
        {
            _config = config;
        }

        // Order determines when this runs relative to other components
        public override int Order => 1;

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            // Only process head tags
            if (string.Equals(context.TagName, "head",
                StringComparison.OrdinalIgnoreCase))
            {
                var trackingId = _config["Analytics:TrackingId"];

                if (!string.IsNullOrEmpty(trackingId))
                {
                    // Append analytics script to head
                    output.PostContent.AppendHtml(
                        $@"<script async src=""https://www.googletagmanager.com/gtag/js?id={trackingId}""></script>
                        <script>
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){{dataLayer.push(arguments);}}
                            gtag('js', new Date());
                            gtag('config', '{trackingId}');
                        </script>"
                    );
                }
            }
        }
    }
}
```

### Registering Tag Helper Components

Register components in `Program.cs`:

```csharp
using MyApp.TagHelpers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

// Register tag helper component
builder.Services.AddTransient<ITagHelperComponent, AnalyticsTagHelperComponent>();

var app = builder.Build();
```

### Adding Scripts to Body

Here is a component that adds scripts before the closing body tag:

```csharp
using Microsoft.AspNetCore.Mvc.Razor.TagHelpers;
using Microsoft.AspNetCore.Razor.TagHelpers;
using System;

namespace MyApp.TagHelpers
{
    public class BodyScriptsTagHelperComponent : TagHelperComponent
    {
        public override int Order => 100;

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            if (string.Equals(context.TagName, "body",
                StringComparison.OrdinalIgnoreCase))
            {
                // Add scripts just before </body>
                output.PostContent.AppendHtml(@"
                    <script src=""/js/app.js""></script>
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            console.log('App initialized');
                        });
                    </script>
                ");
            }
        }
    }
}
```

## Registering Tag Helpers

To use your custom tag helpers in Razor views, register them in `_ViewImports.cshtml`:

```cshtml
@* Register all tag helpers from your assembly *@
@addTagHelper *, MyApp

@* Or register specific tag helpers *@
@addTagHelper MyApp.TagHelpers.AlertTagHelper, MyApp
@addTagHelper MyApp.TagHelpers.CardTagHelper, MyApp

@* Use wildcard for a namespace *@
@addTagHelper MyApp.TagHelpers.*, MyApp
```

To exclude a specific tag helper:

```cshtml
@removeTagHelper MyApp.TagHelpers.DeprecatedTagHelper, MyApp
```

## Complete Example: Tab Container

Here is a complete example showing parent-child tag helpers working together:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyApp.TagHelpers
{
    // Context class to share data between parent and child tag helpers
    public class TabContext
    {
        public List<TabItem> Tabs { get; } = new List<TabItem>();
    }

    public class TabItem
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public bool IsActive { get; set; }
    }

    // Parent tag helper
    [HtmlTargetElement("tab-container")]
    public class TabContainerTagHelper : TagHelper
    {
        public override async Task ProcessAsync(
            TagHelperContext context,
            TagHelperOutput output)
        {
            // Create context for child tabs
            var tabContext = new TabContext();
            context.Items[typeof(TabContext)] = tabContext;

            // Process children first to populate the context
            await output.GetChildContentAsync();

            output.TagName = "div";
            output.Attributes.SetAttribute("class", "tab-container");

            // Build tab navigation
            var navHtml = "<ul class=\"tab-nav\">\n";
            foreach (var tab in tabContext.Tabs)
            {
                var activeClass = tab.IsActive ? " active" : "";
                navHtml += $"<li class=\"tab-nav-item{activeClass}\">" +
                           $"<a href=\"#{tab.Id}\" data-tab=\"{tab.Id}\">{tab.Title}</a>" +
                           $"</li>\n";
            }
            navHtml += "</ul>\n";

            // Build tab content panels
            var contentHtml = "<div class=\"tab-content\">\n";
            foreach (var tab in tabContext.Tabs)
            {
                var activeClass = tab.IsActive ? " active" : "";
                contentHtml += $"<div id=\"{tab.Id}\" class=\"tab-panel{activeClass}\">\n" +
                               $"{tab.Content}\n" +
                               $"</div>\n";
            }
            contentHtml += "</div>";

            output.Content.SetHtmlContent(navHtml + contentHtml);
        }
    }

    // Child tag helper
    [HtmlTargetElement("tab", ParentTag = "tab-container")]
    public class TabTagHelper : TagHelper
    {
        private static int _tabCounter = 0;

        public string Title { get; set; }

        [HtmlAttributeName("active")]
        public bool IsActive { get; set; }

        public override async Task ProcessAsync(
            TagHelperContext context,
            TagHelperOutput output)
        {
            // Get parent context
            var tabContext = context.Items[typeof(TabContext)] as TabContext;

            if (tabContext != null)
            {
                // Get this tab's content
                var childContent = await output.GetChildContentAsync();

                // Add to parent's tab collection
                tabContext.Tabs.Add(new TabItem
                {
                    Id = $"tab-{++_tabCounter}",
                    Title = Title,
                    Content = childContent.GetContent(),
                    IsActive = IsActive
                });
            }

            // Suppress the <tab> element itself
            output.SuppressOutput();
        }
    }
}
```

Usage in Razor:

```html
<tab-container>
    <tab title="Overview" active="true">
        <h3>Welcome</h3>
        <p>This is the overview tab content.</p>
    </tab>
    <tab title="Details">
        <h3>More Information</h3>
        <p>This is the details tab content.</p>
    </tab>
    <tab title="Settings">
        <h3>Configuration</h3>
        <p>Adjust your settings here.</p>
    </tab>
</tab-container>
```

Add the JavaScript to make tabs interactive:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-nav a').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var tabId = this.getAttribute('data-tab');
            var container = this.closest('.tab-container');

            // Update nav
            container.querySelectorAll('.tab-nav-item').forEach(function(item) {
                item.classList.remove('active');
            });
            this.parentElement.classList.add('active');

            // Update panels
            container.querySelectorAll('.tab-panel').forEach(function(panel) {
                panel.classList.remove('active');
            });
            container.querySelector('#' + tabId).classList.add('active');
        });
    });
});
```

## Testing Tag Helpers

Unit testing tag helpers requires setting up the context and output objects:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using Xunit;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyApp.Tests
{
    public class AlertTagHelperTests
    {
        [Fact]
        public void Process_SetsCorrectCssClass()
        {
            // Arrange
            var tagHelper = new AlertTagHelper
            {
                AlertType = "warning"
            };

            var context = new TagHelperContext(
                tagName: "alert",
                allAttributes: new TagHelperAttributeList(),
                items: new Dictionary<object, object>(),
                uniqueId: "test-id"
            );

            var output = new TagHelperOutput(
                tagName: "alert",
                attributes: new TagHelperAttributeList(),
                getChildContentAsync: (useCachedResult, encoder) =>
                {
                    var content = new DefaultTagHelperContent();
                    content.SetContent("Alert message");
                    return Task.FromResult<TagHelperContent>(content);
                }
            );

            // Act
            tagHelper.Process(context, output);

            // Assert
            Assert.Equal("div", output.TagName);
            Assert.Contains("alert-warning",
                output.Attributes["class"].Value.ToString());
        }

        [Fact]
        public async Task ProcessAsync_RendersChildContent()
        {
            // Arrange
            var tagHelper = new PanelTagHelper
            {
                Title = "Test Panel"
            };

            var context = new TagHelperContext(
                tagName: "panel",
                allAttributes: new TagHelperAttributeList(),
                items: new Dictionary<object, object>(),
                uniqueId: "test-id"
            );

            var expectedContent = "<p>Panel content</p>";
            var output = new TagHelperOutput(
                tagName: "panel",
                attributes: new TagHelperAttributeList(),
                getChildContentAsync: (useCachedResult, encoder) =>
                {
                    var content = new DefaultTagHelperContent();
                    content.SetHtmlContent(expectedContent);
                    return Task.FromResult<TagHelperContent>(content);
                }
            );

            // Act
            await tagHelper.ProcessAsync(context, output);

            // Assert
            var renderedContent = output.Content.GetContent();
            Assert.Contains("Test Panel", output.PreContent.GetContent());
        }
    }
}
```

## Performance Tips

1. **Avoid blocking calls**: Always use `ProcessAsync` when you need to perform I/O operations. Never use `.Result` or `.Wait()` on async methods.

2. **Cache expensive operations**: If your tag helper fetches data or performs calculations, consider caching the results.

3. **Minimize allocations**: Reuse `StringBuilder` instances for building large strings.

4. **Use TagHelperOutput efficiently**: Set properties directly rather than building intermediate strings when possible.

```csharp
// Less efficient
var html = $"<div class=\"{cssClass}\">{content}</div>";
output.Content.SetHtmlContent(html);

// More efficient for complex content
output.TagName = "div";
output.Attributes.SetAttribute("class", cssClass);
output.Content.SetHtmlContent(content);
```

## Summary

Custom tag helpers provide a clean way to encapsulate server-side rendering logic while maintaining HTML-like syntax in your views. The key points to remember:

- Inherit from `TagHelper` and override `Process` or `ProcessAsync`
- Use `HtmlTargetElement` to control which elements your helper targets
- Manipulate `TagHelperOutput` to control the rendered HTML
- Use bound attributes to accept parameters from your Razor markup
- Tag helper components inject content globally across all views
- Test tag helpers by creating mock context and output objects

Start with simple tag helpers for common UI patterns, then build up to more complex scenarios as you get comfortable with the API.

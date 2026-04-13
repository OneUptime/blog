# How to Use Highlighting in MongoDB Atlas Search Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Highlighting, Search

Description: Learn how to use MongoDB Atlas Search highlighting to return matched text snippets with marked search terms, improving search result display in your application.

---

## Overview

Highlighting in MongoDB Atlas Search returns snippets of text with the matched search terms identified. This is the feature that makes "lorem **ipsum** dolor" style search results possible - your application receives both the full document and metadata about exactly where the search terms appeared, allowing you to display relevant excerpts with matched words emphasized.

## How Highlighting Works

When you request highlighting, Atlas Search returns a `searchHighlights` metadata field containing:
- `path` - which field the highlight is from
- `texts` - an array of text fragments, each with a `type` of "text" (non-matching) or "hit" (matching term)
- `score` - relevance score of this highlight

## Basic Highlighting

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "mongodb performance",
        path: "content"
      },
      highlight: {
        path: "content"
      }
    }
  },
  {
    $limit: 5
  },
  {
    $project: {
      title: 1,
      score: { $meta: "searchScore" },
      highlights: { $meta: "searchHighlights" }
    }
  }
])
```

Result:

```javascript
{
  _id: ObjectId("..."),
  title: "MongoDB Query Optimization",
  score: 4.2,
  highlights: [
    {
      path: "content",
      texts: [
        { value: "Improving ", type: "text" },
        { value: "MongoDB", type: "hit" },
        { value: " query ", type: "text" },
        { value: "performance", type: "hit" },
        { value: " requires careful index design...", type: "text" }
      ],
      score: 1.8
    }
  ]
}
```

## Highlighting Multiple Fields

```javascript
db.articles.aggregate([
  {
    $search: {
      text: {
        query: "replica set configuration",
        path: ["title", "summary", "content"]
      },
      highlight: {
        path: ["title", "summary", "content"],
        maxNumPassages: 3,     // max number of text passages per document
        maxCharsToExamine: 100000  // max characters to analyze per document
      }
    }
  },
  {
    $project: {
      title: 1,
      highlights: { $meta: "searchHighlights" }
    }
  }
])
```

## Highlight Options

```javascript
highlight: {
  path: "content",
  maxNumPassages: 5,       // max snippets to return per document (default: 5)
  maxCharsToExamine: 500000  // max chars to scan per document (default: 500000)
}
```

## Rendering Highlights in Your Application

Transform the highlights metadata into HTML in your application:

```javascript
// Node.js function to render highlights as HTML
function renderHighlight(highlights) {
  if (!highlights || highlights.length === 0) {
    return '';
  }
  
  // Take the highest-scoring highlight
  let best = highlights.sort((a, b) => b.score - a.score)[0];
  
  // Convert to HTML
  return best.texts.map(function(fragment) {
    if (fragment.type === 'hit') {
      return `<mark>${fragment.value}</mark>`;
    }
    return fragment.value;
  }).join('');
}

// Usage
results.forEach(function(doc) {
  let snippet = renderHighlight(doc.highlights);
  console.log(`<h3>${doc.title}</h3><p>${snippet}</p>`);
});
```

## Python Rendering Example

```python
def render_highlight(highlights):
    if not highlights:
        return ""
    
    # Take best highlight
    best = sorted(highlights, key=lambda h: h.get("score", 0), reverse=True)[0]
    
    parts = []
    for fragment in best["texts"]:
        if fragment["type"] == "hit":
            parts.append(f"<mark>{fragment['value']}</mark>")
        else:
            parts.append(fragment["value"])
    
    return "".join(parts)

# Usage
for doc in results:
    snippet = render_highlight(doc.get("highlights", []))
    print(f"<h3>{doc['title']}</h3><p>{snippet}</p>")
```

## Combining Highlights with compound Queries

Highlighting works with any Atlas Search operator:

```javascript
db.articles.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "sharding",
              path: "content"
            }
          }
        ],
        should: [
          {
            text: {
              query: "horizontal scaling",
              path: "content"
            }
          }
        ],
        filter: [
          {
            equals: {
              path: "published",
              value: true
            }
          }
        ]
      },
      highlight: {
        path: "content",
        maxNumPassages: 2
      }
    }
  },
  {
    $project: {
      title: 1,
      author: 1,
      score: { $meta: "searchScore" },
      highlights: { $meta: "searchHighlights" }
    }
  },
  {
    $limit: 10
  }
])
```

## Selecting the Best Passage

When multiple passages are returned, select the most relevant:

```javascript
// Post-process highlights to find the best snippet
db.articles.aggregate([
  {
    $search: {
      text: { query: "replica set failover", path: "content" },
      highlight: { path: "content", maxNumPassages: 5 }
    }
  },
  {
    $project: {
      title: 1,
      allHighlights: { $meta: "searchHighlights" }
    }
  },
  {
    // Sort highlights by score and pick the best one
    $addFields: {
      bestHighlight: {
        $arrayElemAt: [
          {
            $sortArray: {
              input: "$allHighlights",
              sortBy: { score: -1 }
            }
          },
          0
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      bestHighlight: 1
    }
  }
])
```

## Summary

Highlighting in MongoDB Atlas Search returns text snippets with matched terms identified as "hit" fragments, enabling rich search result displays with bolded matching terms. Request highlights in the `$search` stage using the `highlight` option, then access them via `{ $meta: "searchHighlights" }` in the `$project` stage. Each highlight contains an array of text fragments with `type: "hit"` for matched terms and `type: "text"` for surrounding context. Transform these fragments into HTML in your application to show users exactly why each result matched their search.

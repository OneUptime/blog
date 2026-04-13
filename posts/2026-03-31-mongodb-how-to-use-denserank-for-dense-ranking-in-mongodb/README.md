# How to Use $denseRank for Dense Ranking in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Window Function, Ranking, Aggregation, Analytics

Description: Learn how to use $denseRank in MongoDB's $setWindowFields to assign consecutive rankings without gaps for tied values in tier-based analytics.

---

## What Is $denseRank

`$denseRank` is a window function operator in MongoDB's `$setWindowFields` (5.0+). Like `$rank`, it assigns ranking positions to documents based on sort order. The key difference: when documents tie, they receive the same rank but the next rank increments by 1 - not by the number of tied documents. This produces dense, gap-free rankings.

## $rank vs $denseRank

```text
Scores: 100, 90, 90, 80, 70

$rank:      1, 2, 2, 4, 5   (gap: skips 3 after two ties at 2)
$denseRank: 1, 2, 2, 3, 4   (no gap: consecutive after ties)
```

## Basic Syntax

```javascript
{
  $setWindowFields: {
    partitionBy: "$category",
    sortBy: { score: -1 },
    output: {
      denseRank: { $denseRank: {} }
    }
  }
}
```

## Setup - Employee Performance Dataset

```javascript
db.employees.insertMany([
  { name: "Alice",  dept: "Engineering", performanceScore: 95, salary: 120000 },
  { name: "Bob",    dept: "Engineering", performanceScore: 90, salary: 110000 },
  { name: "Carol",  dept: "Engineering", performanceScore: 90, salary: 108000 },
  { name: "Dave",   dept: "Engineering", performanceScore: 85, salary: 100000 },
  { name: "Eve",    dept: "Marketing",   performanceScore: 92, salary: 95000  },
  { name: "Frank",  dept: "Marketing",   performanceScore: 88, salary: 90000  },
  { name: "Grace",  dept: "Marketing",   performanceScore: 88, salary: 88000  },
  { name: "Henry",  dept: "Marketing",   performanceScore: 80, salary: 80000  },
  { name: "Iris",   dept: "Sales",       performanceScore: 97, salary: 75000  },
  { name: "Jack",   dept: "Sales",       performanceScore: 97, salary: 73000  },
  { name: "Karen",  dept: "Sales",       performanceScore: 85, salary: 70000  }
]);
```

## Example 1 - Dense Rank by Department

Assign dense performance ranks within each department:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$dept",
      sortBy: { performanceScore: -1 },
      output: {
        denseRank: { $denseRank: {} }
      }
    }
  },
  { $sort: { dept: 1, denseRank: 1 } }
]);
```

```text
dept: Engineering
Alice  score:95  denseRank:1
Bob    score:90  denseRank:2
Carol  score:90  denseRank:2  <- tied, same rank
Dave   score:85  denseRank:3  <- next rank is 3 (not 4)

dept: Sales
Iris   score:97  denseRank:1
Jack   score:97  denseRank:1  <- tied
Karen  score:85  denseRank:2  <- next rank is 2 (not 3)
```

## Example 2 - Tier Assignment Using Dense Rank

Map dense ranks to tiers - the consecutive nature makes this clean:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$dept",
      sortBy: { performanceScore: -1 },
      output: {
        denseRank: { $denseRank: {} }
      }
    }
  },
  {
    $addFields: {
      tier: {
        $switch: {
          branches: [
            { case: { $eq: ["$denseRank", 1] }, then: "Exceptional" },
            { case: { $eq: ["$denseRank", 2] }, then: "Exceeds Expectations" },
            { case: { $eq: ["$denseRank", 3] }, then: "Meets Expectations" }
          ],
          default: "Below Expectations"
        }
      }
    }
  },
  { $sort: { dept: 1, denseRank: 1 } }
]);
```

## Example 3 - Salary Equity Check

Find employees with the same performance score but different salaries using dense rank grouping:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$dept",
      sortBy: { performanceScore: -1 },
      output: {
        denseRank: { $denseRank: {} },
        avgSalaryAtRank: {
          $avg: "$salary",
          window: { documents: ["current", "current"] }
        }
      }
    }
  },
  {
    $group: {
      _id: { dept: "$dept", denseRank: "$denseRank" },
      employees: { $push: { name: "$name", salary: "$salary", score: "$performanceScore" } },
      maxSalary: { $max: "$salary" },
      minSalary: { $min: "$salary" }
    }
  },
  {
    $addFields: {
      salaryRange: { $subtract: ["$maxSalary", "$minSalary"] }
    }
  },
  { $match: { salaryRange: { $gt: 0 } } },  // same rank, different salary
  { $sort: { "_id.dept": 1, "_id.denseRank": 1 } }
]);
```

## Example 4 - Dense Rank Across All Departments

Compute a global dense rank ignoring department boundaries:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      // No partitionBy = single partition over all documents
      sortBy: { performanceScore: -1 },
      output: {
        globalDenseRank: { $denseRank: {} }
      }
    }
  },
  {
    $setWindowFields: {
      partitionBy: "$dept",
      sortBy: { performanceScore: -1 },
      output: {
        deptDenseRank: { $denseRank: {} }
      }
    }
  },
  { $sort: { globalDenseRank: 1 } }
]);
```

## Example 5 - Number of Unique Rank Levels

Count how many distinct performance tiers exist in each department:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$dept",
      sortBy: { performanceScore: -1 },
      output: {
        denseRank: { $denseRank: {} }
      }
    }
  },
  {
    $group: {
      _id: "$dept",
      totalEmployees: { $sum: 1 },
      distinctTiers: { $max: "$denseRank" }
    }
  }
]);
```

## Choosing Between $rank, $denseRank, and $documentNumber

```text
$rank:
- Gaps after ties (1, 2, 2, 4, 5)
- Use for competition results, sports standings

$denseRank:
- No gaps after ties (1, 2, 2, 3, 4)
- Use for tier systems, grade bands, bucket assignment

$documentNumber:
- Unique sequential number per row (1, 2, 3, 4, 5)
- No ties - every row gets a unique number
- Use for offset-based pagination, unique row numbering
```

## Summary

`$denseRank` in MongoDB's `$setWindowFields` produces consecutive rankings without gaps when documents tie, making it ideal for tier-based classification, grade bands, and salary banding systems. Its gap-free behavior means you can cleanly map rank numbers to tier names without edge cases. Use it over `$rank` when gaps would be confusing or when you need the maximum rank value to represent the exact number of distinct performance levels.

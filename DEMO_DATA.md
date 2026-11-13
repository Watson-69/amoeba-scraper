# Demo Data

**This data is real public metadata from Steam, retrieved on 2026-11-12, with no download links or prices.**

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `app_id` | integer | Steam Application ID |
| `title` | string | Game title |
| `developer` | string | Developer name |
| `publisher` | string | Publisher name |
| `release_date` | string (YYYY-MM-DD) | Official release date |
| `early_access_date` | string (YYYY-MM-DD) | Early access release date (if applicable) |
| `genres` | string[] | Steam genre tags |
| `tags` | string[] | Steam user-defined tags |
| `platforms` | string[] | Supported platforms |
| `metacritic` | integer | Metacritic score (0-100) |
| `languages` | string[] | Supported languages |
| `features` | string[] | Steam features (achievements, cloud, etc.) |
| `review_summary` | object | Aggregate review data |

### Review Summary Fields

| Field | Type | Description |
|-------|------|-------------|
| `all_reviews` | string | Overall review sentiment |
| `percent_positive` | integer | Percentage of positive reviews |
| `review_count` | integer | Total number of reviews |
| `snapshot_date` | string (YYYY-MM-DD) | Date this data was retrieved |

---

## Records

### Hades (app_id: 1145360)

```json
{
  "app_id": 1145360,
  "title": "Hades",
  "developer": "Supergiant Games",
  "publisher": "Supergiant Games",
  "release_date": "2020-09-17",
  "early_access_date": "2019-12-10",
  "genres": ["Action", "Indie", "RPG"],
  "tags": ["Action", "Roguelike", "Roguelite", "Hack and Slash", "Mythology", "Story Rich", "Isometric", "Difficult", "Singleplayer", "Atmospheric"],
  "platforms": ["Windows", "macOS", "Linux", "Nintendo Switch", "PlayStation 4", "PlayStation 5", "Xbox One", "Xbox Series X/S"],
  "metacritic": 93,
  "languages": ["English", "French", "Italian", "German", "Spanish - Spain", "Korean", "Portuguese - Brazil", "Russian", "Simplified Chinese", "Traditional Chinese", "Polish", "Japanese"],
  "features": ["Single-player", "Steam Achievements", "Steam Trading Cards", "Steam Cloud", "Remote Play", "Family Sharing", "Steam Deck Verified"],
  "review_summary": {
    "all_reviews": "Overwhelmingly Positive",
    "percent_positive": 98,
    "review_count": 143360,
    "snapshot_date": "2026-11-12"
  }
}
```

### Stardew Valley (app_id: 413150)

```json
{
  "app_id": 413150,
  "title": "Stardew Valley",
  "developer": "ConcernedApe",
  "publisher": "ConcernedApe",
  "release_date": "2016-02-26",
  "early_access_date": null,
  "genres": ["Simulation", "RPG", "Indie"],
  "tags": ["Farming Sim", "Simulation", "RPG", "Crafting", "Pixel Graphics", "Stylized", "Relaxing", "Singleplayer", "Multiplayer", "Co-op", "Open World", "Sandbox", "Life Sim", "Management", "Story Rich"],
  "platforms": ["Windows", "macOS", "Linux", "Nintendo Switch", "PlayStation 4", "PlayStation 5", "Xbox One", "Xbox Series X/S", "iOS", "Android"],
  "metacritic": 89,
  "languages": ["English", "French", "Italian", "German", "Spanish - Spain", "Japanese", "Korean", "Portuguese - Brazil", "Russian", "Simplified Chinese", "Traditional Chinese", "Turkish", "Hungarian", "Polish", "Portuguese", "Ukrainian"],
  "features": ["Single-player", "Multiplayer", "Co-op", "Steam Achievements", "Steam Trading Cards", "Steam Cloud", "Remote Play", "Family Sharing", "Steam Workshop", "Steam Deck Verified"],
  "review_summary": {
    "all_reviews": "Overwhelmingly Positive",
    "percent_positive": 98,
    "review_count": 345210,
    "snapshot_date": "2026-11-12"
  }
}
```

### Portal 2 (app_id: 620)

```json
{
  "app_id": 620,
  "title": "Portal 2",
  "developer": "Valve Corporation",
  "publisher": "Valve Corporation",
  "release_date": "2011-04-18",
  "early_access_date": null,
  "genres": ["Action", "Adventure", "Puzzle"],
  "tags": ["Puzzle", "Co-op", "Physics", "Story Rich", "Singleplayer", "Multiplayer", "Great Soundtrack", "Funny", "First-Person", "Science", "Valve", "Classic", "Masterpiece"],
  "platforms": ["Windows", "macOS", "Linux", "PlayStation 3", "Xbox 360"],
  "metacritic": 95,
  "languages": ["English", "French", "Italian", "German", "Spanish - Spain", "Korean", "Polish", "Portuguese - Brazil", "Russian", "Simplified Chinese", "Traditional Chinese", "Japanese"],
  "features": ["Single-player", "Multiplayer", "Co-op", "Steam Achievements", "Steam Trading Cards", "Steam Cloud", "Steam Workshop", "Remote Play", "Family Sharing", "Valve Anti-Cheat enabled"],
  "review_summary": {
    "all_reviews": "Overwhelmingly Positive",
    "percent_positive": 98,
    "review_count": 198750,
    "snapshot_date": "2026-11-12"
  }
}
```
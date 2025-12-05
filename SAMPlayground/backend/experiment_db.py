"""
Experiment Database Manager
Handles SQLite database operations for experiment persistence
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

# Database file path
DB_PATH = Path(__file__).parent / "experiments.db"


def dict_factory(cursor, row):
    """Convert SQLite rows to dictionaries"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def get_connection():
    """Get database connection with row factory"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = dict_factory
    return conn


def init_db():
    """Initialize database with schema"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Experiments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Timeline entries table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiment_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            experiment_id INTEGER NOT NULL,
            step_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            data TEXT,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
    """)
    
    # Videos table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiment_videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            experiment_id INTEGER NOT NULL,
            video_url TEXT NOT NULL,
            video_type TEXT NOT NULL,
            added_at TEXT NOT NULL,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for better performance
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timeline_experiment 
        ON experiment_timeline(experiment_id)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_videos_experiment 
        ON experiment_videos(experiment_id)
    """)
    
    conn.commit()
    conn.close()


def create_experiment(name: str = "unnamed experiment") -> int:
    """Create a new experiment and return its ID"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO experiments (name, created_at, updated_at)
        VALUES (?, ?, ?)
    """, (name, now, now))
    
    experiment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return experiment_id


def get_all_experiments() -> List[Dict[str, Any]]:
    """Get all experiments with summary info"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            e.id,
            e.name,
            e.created_at,
            e.updated_at,
            COUNT(DISTINCT t.id) as timeline_count,
            (SELECT video_url FROM experiment_videos 
             WHERE experiment_id = e.id 
             ORDER BY added_at DESC LIMIT 1) as latest_video
        FROM experiments e
        LEFT JOIN experiment_timeline t ON e.id = t.experiment_id
        GROUP BY e.id
        ORDER BY e.updated_at DESC
    """)
    
    experiments = cursor.fetchall()
    conn.close()
    
    return experiments


def get_experiment(experiment_id: int) -> Optional[Dict[str, Any]]:
    """Get experiment details with full timeline"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get experiment info
    cursor.execute("""
        SELECT * FROM experiments WHERE id = ?
    """, (experiment_id,))
    
    experiment = cursor.fetchone()
    if not experiment:
        conn.close()
        return None
    
    # Get timeline entries
    cursor.execute("""
        SELECT * FROM experiment_timeline 
        WHERE experiment_id = ?
        ORDER BY timestamp ASC
    """, (experiment_id,))
    
    timeline = cursor.fetchall()
    
    # Parse JSON data in timeline entries
    for entry in timeline:
        if entry['data']:
            try:
                entry['data'] = json.loads(entry['data'])
            except json.JSONDecodeError:
                entry['data'] = None
    
    # Get videos
    cursor.execute("""
        SELECT * FROM experiment_videos 
        WHERE experiment_id = ?
        ORDER BY added_at DESC
    """, (experiment_id,))
    
    videos = cursor.fetchall()
    
    conn.close()
    
    experiment['timeline'] = timeline
    experiment['videos'] = videos
    
    return experiment


def update_experiment_name(experiment_id: int, name: str) -> bool:
    """Update experiment name"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE experiments 
        SET name = ?, updated_at = ?
        WHERE id = ?
    """, (name, now, experiment_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success


def update_experiment_timestamp(experiment_id: int):
    """Update experiment's updated_at timestamp"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE experiments 
        SET updated_at = ?
        WHERE id = ?
    """, (now, experiment_id))
    
    conn.commit()
    conn.close()


def add_timeline_entry(
    experiment_id: int, 
    step_type: str, 
    data: Optional[Dict[str, Any]] = None
) -> int:
    """Add a timeline entry to an experiment"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    data_json = json.dumps(data) if data else None
    
    cursor.execute("""
        INSERT INTO experiment_timeline (experiment_id, step_type, timestamp, data)
        VALUES (?, ?, ?, ?)
    """, (experiment_id, step_type, now, data_json))
    
    entry_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Update experiment timestamp
    update_experiment_timestamp(experiment_id)
    
    return entry_id


def add_video(experiment_id: int, video_url: str, video_type: str) -> int:
    """Add a video reference to an experiment"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO experiment_videos (experiment_id, video_url, video_type, added_at)
        VALUES (?, ?, ?, ?)
    """, (experiment_id, video_url, video_type, now))
    
    video_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return video_id


def delete_experiment(experiment_id: int) -> bool:
    """Delete an experiment and all related data"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM experiments WHERE id = ?
    """, (experiment_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success


# Initialize database on module import
init_db()

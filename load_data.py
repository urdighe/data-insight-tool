#!/usr/bin/env python3
"""
Bulk CSV to PostgreSQL Loader
Loads all CSV files from a folder into PostgreSQL database with automatic table creation.
"""

import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import argparse
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any
import time
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("csv_loader.log"), logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


class BulkCSVLoader:
    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        user: str,
        password: str,
        schema: str = "public",
    ):
        """Initialize database connection parameters."""
        self.connection_params = {
            "host": host,
            "port": port,
            "database": database,
            "user": user,
            "password": password,
        }
        self.schema = schema
        self.conn = None
        self.cursor = None

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(**self.connection_params)
            self.cursor = self.conn.cursor()
            logger.info("Successfully connected to PostgreSQL database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def close(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")

    def get_postgres_type(self, pandas_dtype: str, sample_data: Any = None) -> str:
        """Map pandas data types to PostgreSQL data types with smart detection."""
        type_mapping = {
            "object": "TEXT",
            "string": "TEXT",
            "int64": "BIGINT",
            "int32": "INTEGER",
            "float64": "DOUBLE PRECISION",
            "float32": "REAL",
            "bool": "BOOLEAN",
            "datetime64[ns]": "TIMESTAMP",
            "category": "TEXT",
        }

        pg_type = type_mapping.get(str(pandas_dtype), "TEXT")

        # Smart type detection for object columns
        if pandas_dtype == "object" and sample_data is not None:
            try:
                # Try to parse as date
                pd.to_datetime(sample_data)
                pg_type = "TIMESTAMP"
            except:
                try:
                    # Try to parse as numeric
                    float(sample_data)
                    pg_type = "DOUBLE PRECISION"
                except:
                    # Check if it's boolean
                    if str(sample_data).lower() in ["true", "false", "1", "0"]:
                        pg_type = "BOOLEAN"
                    else:
                        pg_type = "TEXT"

        return pg_type

    def clean_column_name(self, column: str) -> str:
        """Clean column name for PostgreSQL compatibility."""
        # Replace spaces and special characters with underscores
        cleaned = column.replace(" ", "_").replace("-", "_").replace(".", "_")
        # Remove any non-alphanumeric characters except underscores
        cleaned = "".join(c for c in cleaned if c.isalnum() or c == "_")
        # Ensure it doesn't start with a number
        if cleaned and cleaned[0].isdigit():
            cleaned = "col_" + cleaned
        # Ensure it's not empty
        if not cleaned:
            cleaned = "unnamed_column"
        return cleaned.lower()

    def create_table(self, table_name: str, df: pd.DataFrame) -> bool:
        """Create table based on DataFrame structure."""
        try:
            # Clean table name
            table_name = self.clean_column_name(table_name)

            # Generate column definitions
            columns = []
            for col, dtype in df.dtypes.items():
                clean_col = self.clean_column_name(col)
                # Get sample data for smart type detection
                sample_data = (
                    df[col].dropna().iloc[0] if not df[col].dropna().empty else None
                )
                pg_type = self.get_postgres_type(dtype, sample_data)
                columns.append(f'"{clean_col}" {pg_type}')

            # Create table SQL
            create_sql = f"""
            CREATE TABLE IF NOT EXISTS {self.schema}.{table_name} (
                {', '.join(columns)}
            );
            """

            self.cursor.execute(create_sql)
            self.conn.commit()
            logger.info(f"Table {self.schema}.{table_name} created successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to create table {table_name}: {e}")
            self.conn.rollback()
            return False

    def load_dataframe(
        self, df: pd.DataFrame, table_name: str, chunk_size: int = 1000
    ) -> bool:
        """Load DataFrame into PostgreSQL table."""
        try:
            # Clean column names
            df.columns = [self.clean_column_name(col) for col in df.columns]

            # Create table if it doesn't exist
            if not self.create_table(table_name, df):
                return False

            # Insert data in chunks
            total_rows = len(df)
            logger.info(f"Loading {total_rows} rows into {self.schema}.{table_name}")

            for i in range(0, total_rows, chunk_size):
                chunk = df.iloc[i : i + chunk_size]

                # Prepare data for insertion
                columns = [f'"{col}"' for col in chunk.columns]
                values = [tuple(row) for row in chunk.values]

                # Insert chunk
                insert_sql = f"""
                INSERT INTO {self.schema}.{table_name} ({', '.join(columns)})
                VALUES %s;
                """

                execute_values(self.cursor, insert_sql, values)
                self.conn.commit()

                logger.info(f"Inserted rows {i+1} to {min(i+chunk_size, total_rows)}")

            logger.info(
                f"Successfully loaded {total_rows} rows into {self.schema}.{table_name}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to load data into {table_name}: {e}")
            self.conn.rollback()
            return False

    def process_csv_file(
        self,
        file_path: Path,
        chunk_size: int = 1000,
        encoding: str = "utf-8",
        delimiter: str = ",",
    ) -> Dict[str, Any]:
        """Process a single CSV file and return results."""
        result = {
            "file_name": file_path.name,
            "file_path": str(file_path),
            "success": False,
            "rows_loaded": 0,
            "error": None,
            "processing_time": 0,
        }

        start_time = time.time()

        try:
            logger.info(f"Processing file: {file_path.name}")

            # Read CSV file
            df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter)
            df = df.replace({pd.NA: None, pd.NaT: None})

            # Generate table name from file name
            table_name = file_path.stem  # Remove extension

            # Load data
            if self.load_dataframe(df, table_name, chunk_size):
                result["success"] = True
                result["rows_loaded"] = len(df)
                result["table_name"] = (
                    f"{self.schema}.{self.clean_column_name(table_name)}"
                )

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Error processing {file_path.name}: {e}")

        result["processing_time"] = time.time() - start_time
        return result

    def process_folder(
        self,
        folder_path: str,
        chunk_size: int = 1000,
        encoding: str = "utf-8",
        delimiter: str = ",",
        file_pattern: str = "*.csv",
    ) -> List[Dict[str, Any]]:
        """Process all CSV files in a folder."""
        folder = Path(folder_path)

        if not folder.exists():
            logger.error(f"Folder not found: {folder_path}")
            return []

        if not folder.is_dir():
            logger.error(f"Path is not a directory: {folder_path}")
            return []

        # Find all CSV files
        csv_files = list(folder.glob(file_pattern))

        if not csv_files:
            logger.warning(f"No CSV files found in {folder_path}")
            return []

        logger.info(f"Found {len(csv_files)} CSV files to process")

        results = []
        total_files = len(csv_files)
        successful_files = 0

        for i, file_path in enumerate(csv_files, 1):
            logger.info(f"Processing file {i}/{total_files}: {file_path.name}")

            result = self.process_csv_file(file_path, chunk_size, encoding, delimiter)
            results.append(result)

            if result["success"]:
                successful_files += 1

            # Progress update
            logger.info(
                f"Progress: {i}/{total_files} files processed ({successful_files} successful)"
            )

        return results

    def generate_report(
        self, results: List[Dict[str, Any]], output_file: str = None
    ) -> str:
        """Generate a summary report of the loading process."""
        total_files = len(results)
        successful_files = sum(1 for r in results if r["success"])
        failed_files = total_files - successful_files
        total_rows = sum(r["rows_loaded"] for r in results if r["success"])
        total_time = sum(r["processing_time"] for r in results)

        report = f"""
=== CSV to PostgreSQL Loading Report ===
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Summary:
- Total files processed: {total_files}
- Successful loads: {successful_files}
- Failed loads: {failed_files}
- Total rows loaded: {total_rows:,}
- Total processing time: {total_time:.2f} seconds
- Average time per file: {total_time/total_files:.2f} seconds

Detailed Results:
"""

        for result in results:
            status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
            report += f"\n{status} - {result['file_name']}"
            if result["success"]:
                report += f" ({result['rows_loaded']:,} rows, {result['processing_time']:.2f}s)"
                report += f" -> {result['table_name']}"
            else:
                report += f" - Error: {result['error']}"

        # Add failed files summary
        if failed_files > 0:
            report += f"\n\nFailed Files:"
            for result in results:
                if not result["success"]:
                    report += f"\n- {result['file_name']}: {result['error']}"

        if output_file:
            with open(output_file, "w") as f:
                f.write(report)
            logger.info(f"Report saved to: {output_file}")

        return report


def main():
    parser = argparse.ArgumentParser(description="Bulk CSV to PostgreSQL Loader")
    parser.add_argument("folder_path", help="Path to folder containing CSV files")
    parser.add_argument("--host", default="localhost", help="Database host")
    parser.add_argument("--port", type=int, default=5432, help="Database port")
    parser.add_argument("--database", default="data_insights", help="Database name")
    parser.add_argument("--user", default="insight_user", help="Database user")
    parser.add_argument(
        "--password", default="insight_password", help="Database password"
    )
    parser.add_argument("--schema", default="public", help="Database schema")
    parser.add_argument(
        "--chunk-size", type=int, default=1000, help="Chunk size for data loading"
    )
    parser.add_argument("--encoding", default="utf-8", help="CSV file encoding")
    parser.add_argument("--delimiter", default=",", help="CSV delimiter")
    parser.add_argument("--pattern", default="*.csv", help="File pattern to match")
    parser.add_argument("--report", help="Output file for detailed report")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be processed without loading",
    )

    args = parser.parse_args()

    # Validate folder path
    if not os.path.exists(args.folder_path):
        logger.error(f"Folder not found: {args.folder_path}")
        sys.exit(1)

    if not os.path.isdir(args.folder_path):
        logger.error(f"Path is not a directory: {args.folder_path}")
        sys.exit(1)

    # Initialize loader
    loader = BulkCSVLoader(
        host=args.host,
        port=args.port,
        database=args.database,
        user=args.user,
        password=args.password,
        schema=args.schema,
    )

    try:
        # Connect to database
        loader.connect()

        if args.dry_run:
            # Show what would be processed
            folder = Path(args.folder_path)
            csv_files = list(folder.glob(args.pattern))
            logger.info(f"DRY RUN: Would process {len(csv_files)} files:")
            for file_path in csv_files:
                logger.info(f"  - {file_path.name}")
            return

        # Process all CSV files
        results = loader.process_folder(
            args.folder_path,
            chunk_size=args.chunk_size,
            encoding=args.encoding,
            delimiter=args.delimiter,
            file_pattern=args.pattern,
        )

        # Generate and display report
        report = loader.generate_report(results, args.report)
        print(report)

        # Exit with error if any files failed
        failed_files = sum(1 for r in results if not r["success"])
        if failed_files > 0:
            logger.warning(f"{failed_files} files failed to load")
            sys.exit(1)
        else:
            logger.info("All files processed successfully!")

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        loader.close()


if __name__ == "__main__":
    main()

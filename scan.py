import json
import codecs

def find_json_error(file_path):
    # Try reading with utf-8-sig to handle BOM
    try:
        with codecs.open(file_path, 'r', encoding='utf-8-sig') as file:
            content = file.read()
    except UnicodeDecodeError:
        print("Error: Unable to read the file with UTF-8 encoding.")
        return

    # Print first few characters for debugging
    print("First 20 characters of the file:")
    print(repr(content[:20]))

    # Try to parse the entire JSON
    try:
        json.loads(content)
        print("The entire JSON is valid.")
        return
    except json.JSONDecodeError as e:
        print(f"JSON error detected: {str(e)}")

    # If error, try to locate it
    for i in range(len(content)):
        try:
            json.loads(content[:i+1])
        except json.JSONDecodeError as e:
            print(f"\nError at position {i}:")
            start = max(0, i-50)
            end = min(len(content), i+50)
            print(content[start:end])
            print(" " * (i - start) + "^")
            print(f"Error message: {str(e)}")
            return

# Usage
find_json_error('attribute_mapping.json')
import json

# Read the JSON file
with open('attribute_mapping.json', 'r') as file:
    data = json.load(file)

# Create a new dictionary to store the merged data
merged_data = {}

# Iterate through the original data
for key, value in data.items():
    if key in merged_data:
        # If the key already exists, extend the list with new unique values
        merged_data[key] = list(set(merged_data[key] + value))
    else:
        # If it's a new key, add it to the merged data
        merged_data[key] = value

# Write the merged data back to a JSON file
with open('merged_attribute_mapping.json', 'w') as file:
    json.dump(merged_data, file, indent=4)
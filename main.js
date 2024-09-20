require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { consolidateAttributes } = require('./gptHelper');

async function run() {
    console.log("Starting the run function");

    try {
        console.log("Attempting to read attribute mapping file");

        const attributeMappingPath = path.join(__dirname, 'attribute_mapping.json');
        console.log("Attribute mapping file path:", attributeMappingPath);

        const rawFileContent = await fs.readFile(attributeMappingPath, 'utf8');
        console.log("Raw file content length:", rawFileContent.length);
        console.log("First 100 characters of raw content:", rawFileContent.slice(0, 100));

        let attributeMapping;
        try {
            attributeMapping = JSON.parse(rawFileContent);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError.message);
            console.error("Error position:", parseError.position);
            console.error("Content around error:", 
                rawFileContent.slice(Math.max(0, parseError.position - 50), 
                                     parseError.position + 50));
            throw parseError;
        }

        console.log("JSON parsed successfully");
        console.log(`Number of original attributes: ${Object.keys(attributeMapping).length}`);

        console.log("Calling consolidateAttributes function");
        const result = await consolidateAttributes(attributeMapping);

        console.log("Consolidation complete");
        console.log(`Number of consolidated attributes: ${Object.keys(result).length}`);

        // Report every merge with detailed information
        Object.entries(result).forEach(([key, value]) => {
            if (value.aliases.length > 1) {
                console.log(`Merged: "${key}"`);
                console.log(`  Unified name: ${value.unified}`);
                console.log(`  Aliases: ${value.aliases.join(', ')}`);
                console.log(`  Number of merged attributes: ${value.aliases.length}`);
            } else {
                console.log(`Unchanged: "${key}"`);
            }
        });

        // Save the result to a file
        const outputPath = path.join(__dirname, 'consolidated_attributes.json');
        await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
        console.log("Consolidated results saved to:", outputPath);

        // Log statistics
        const totalOriginalAttributes = Object.keys(attributeMapping).length;
        const totalConsolidatedAttributes = Object.keys(result).length;
        const totalMerged = Object.values(result).filter(v => v.aliases.length > 1).length;
        console.log("\nConsolidation Statistics:");
        console.log(`  Original attributes: ${totalOriginalAttributes}`);
        console.log(`  Consolidated attributes: ${totalConsolidatedAttributes}`);
        console.log(`  Total merged: ${totalMerged}`);
        console.log(`  Reduction percentage: ${((totalOriginalAttributes - totalConsolidatedAttributes) / totalOriginalAttributes * 100).toFixed(2)}%`);

        console.log("Processing complete");
    } catch (error) {
        console.error("An error occurred:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
    }
}

console.log("Script started");
run().then(() => {
    console.log("Script finished execution");
}).catch(error => {
    console.error("Unhzandled error in main execution:", error);
});
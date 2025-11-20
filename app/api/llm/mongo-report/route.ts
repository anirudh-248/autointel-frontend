import { NextRequest, NextResponse } from "next/server";
import { flattenDocuments } from "@/lib/flatten";

export async function POST(req: NextRequest) {
  try {
    const {
      documents,
      config,
      query,
      selectedVisualizations,
      connectionString,
    } = await req.json();

    if (!documents || !config?.apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const flattened = flattenDocuments(documents);
    const sampleData = flattened.slice(0, 10);
    const reportQuery =
      query ||
      "Generate a detailed, comprehensive analytical report of this dataset";

    let schemaInfo = {};
    try {
      const ex = await fetch(`${process.env.BASE_URL}/api/db/overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      });
      if (ex.ok) {
        schemaInfo = await ex.json();
      }
    } catch (schemaErr) {
      console.warn("Could not fetch schema info:", schemaErr);
      // Continue without schema info
    }

    const systemPrompt = `You are a data analyst creating professional reports. Generate a comprehensive HTML report based on the dataset. Use Chart.js for charts. Ensure charts are compatible with PDF rendering as per instructions.;

You must include the selected visualizations in the report. If none are selected, choose appropriate visualizations based on the data.
Selected Visualizations: ${
      selectedVisualizations && selectedVisualizations.length > 0
        ? selectedVisualizations.join(", ")
        : "None"
    }.
Use Chart.js for charts. Ensure charts are compatible with PDF rendering as per instructions.
Dataset Sample:
Flatttened Documents: ${JSON.stringify(flattenDocuments, null, 2)}

Here is the complete schema information of the mongo database:
${JSON.stringify(schemaInfo, null, 2)}
Make sure to include the structure of the DB in the report. 

Create a very detailed beautiful HTML report that includes:
1. Executive Summary
2. Data Overview (schema, collections, row counts, data types)
3. Key Findings and Insights
4. Statistical Analysis
5. Trends and Patterns
6. Recommendations
7. Interactive charts and visualizations using Chart.js to summarize the dataset, with observations and inferences drawn
8. Watermark the HTML with the name AutoIntel and the time of generation

CRITICAL CHART RENDERING INSTRUCTIONS:
- For PDF compatibility, wrap ALL chart initialization code in a DOMContentLoaded event listener
- Each chart MUST have a unique ID
- Place all chart scripts at the END of the body, just before </body>
- Use this exact pattern for EVERY chart:

<div class="chart-container" style="position: relative; height: 400px; margin: 30px 0;">
  <canvas id="uniqueChartId"></canvas>
</div>

And at the end of the document, inside a single script tag:
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Chart.js to load
  if (typeof Chart !== 'undefined') {
    const ctx1 = document.getElementById('uniqueChartId').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Label1', 'Label2'],
        datasets: [{
          label: 'Dataset Label',
          data: [12, 19],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Chart Title' }
        }
      }
    });
    
    // More charts follow the same pattern
  }
});
</script>

Format the response as valid HTML that can be converted to PDF. Use proper semantic HTML with headers, paragraphs, tables, and lists. Make it professional and well-structured.

Return ONLY the HTML content (no markdown code blocks, just pure HTML).`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: reportQuery },
    ];
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model || "x-ai/grok-4.1-fast",
          messages,
        }),
      }
    );

    const data = await response.json();
    let html = data.choices[0]?.message?.content || "";
    html = html.replace(/```html|```/g, "");

    return NextResponse.json({ html });
  } catch (err: any) {
    console.error("mongo-report error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

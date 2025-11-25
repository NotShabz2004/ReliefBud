# Bedrock AI Prompt for Patient Intake Summarization

## Overview
This document defines the best-practice prompt for Amazon Bedrock (Claude 3 Sonnet) to generate AI-assisted summaries from patient intake forms. The prompt is used in the `lambda-intake.js` to create clinical summaries, severity assessments, and department recommendations.

## Prompt Template

```
You are a concise medical assistant. Create a brief professional patient summary (3-6 sentences) suitable for a clinician, along with severity assessment and department recommendation.

Patient Information:
- Full Name: {fullName}
- Age: {age}
- Gender: {gender}
- Main Symptoms: {mainSymptoms}
- Symptom Duration: {symptomDuration}
- Pain Severity (1-10): {painSeverity}
- Medical History: {medicalHistory}
- Current Medications: {currentMedications}
- Allergies: {allergies}
- Preferred Department: {preferredDepartment}

Return your response as JSON:
{
  "summary": "Clinical summary text here (3-6 sentences, professional tone)",
  "severity": "low|moderate|high|critical",
  "recommendedDepartment": "General Medicine|Cardiology|Pediatrics|Dermatology|Other"
}
```

## Implementation Details

### Prompt Characteristics
- **Tone**: Professional, clinical, suitable for medical staff
- **Length**: Concise (3-6 sentences per summary)
- **Output Format**: Structured JSON for easy parsing
- **Safety**: No diagnoses or medical advice; clinical assessment only

### Severity Levels
- **low**: Minor symptoms, routine follow-up recommended
- **moderate**: Significant symptoms, specialist consultation suggested
- **high**: Urgent symptoms, prompt medical attention needed
- **critical**: Emergency symptoms, immediate intervention required

### Department Recommendations
- General Medicine
- Cardiology
- Pediatrics
- Dermatology
- Other (for departments not listed)

## Integration

### In Lambda Code (`lambda-intake.js`)
The prompt is generated dynamically in the `buildBedrockPrompt()` function:

```javascript
function buildBedrockPrompt(patientData) {
  return `You are a concise medical assistant...` // Full prompt above
}
```

### Bedrock API Call
```javascript
const response = await bedrock.send(
  new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet',
    body: JSON.stringify({ input: prompt }),
    contentType: 'application/json'
  })
);

// Parse response
const { summary, severity, recommendedDepartment } = JSON.parse(response.body);
```

## Expected Response Format

```json
{
  "summary": "32-year-old female presents with acute-onset severe headache and neck stiffness for 12 hours. Associated with fever (38.5°C). No photophobia reported. Pain rated 8/10. No significant medical history or medication use. Non-smoker. Requires urgent evaluation to rule out serious causes.",
  "severity": "high",
  "recommendedDepartment": "General Medicine"
}
```

## Custom Instructions (Optional Enhancements)

### For Mental Health Focus
Add to prompt: "Consider mental health and stress factors in your assessment."

### For Geriatric Patients (Age > 65)
Add to prompt: "Emphasize medication interactions and comorbidities given patient age."

### For Pediatric Patients (Age < 18)
Add to prompt: "Focus on developmental considerations and parental concerns."

## Error Handling

If Bedrock API fails:
1. Log the error
2. Continue with default values:
   ```json
   {
     "summary": "Intake received and queued for manual review",
     "severity": null,
     "recommendedDepartment": null
   }
   ```
3. **Do not block** patient intake submission

## Testing the Prompt

### Local Testing (Node.js)
```bash
node -e "
const data = {
  fullName: 'John Doe',
  age: 45,
  gender: 'Male',
  mainSymptoms: 'Chest pain',
  symptomDuration: '3 hours',
  painSeverity: 9,
  medicalHistory: 'Hypertension',
  currentMedications: 'Lisinopril',
  allergies: 'Penicillin',
  preferredDepartment: 'Cardiology'
};

// Test buildBedrockPrompt with sample data
console.log(buildBedrockPrompt(data));
"
```

### AWS Console Testing
1. Go to AWS Console → Bedrock
2. Create a chat session
3. Paste the full prompt with sample patient data
4. Verify response format matches expected JSON

## Considerations

### Cost
- Bedrock pricing is per-token: monitor usage in production
- Consider caching common responses

### Latency
- Bedrock API calls add 1-3 seconds to Lambda execution
- Consider async processing for high-volume intake

### Compliance
- All patient data sent to Bedrock must comply with HIPAA/PHI regulations
- Ensure AWS Bedrock has appropriate business associate agreements if handling real PHI

## References
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3 Model Card](https://www.anthropic.com/product)
- [Prompt Engineering Best Practices](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

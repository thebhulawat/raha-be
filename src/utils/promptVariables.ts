export const promptVariables = {
  insight_guidelines: `
1. Carefully analyze the transcript, paying attention to the user's statements, emotions, and behaviors.
2. Identify key themes, patterns, or recurring issues in the user's responses.
3. Consider the user's thought processes, coping mechanisms, and any cognitive distortions that may be present.
4. Look for any significant life events, relationships, or circumstances that seem to impact the user's mental state.
5. Assess the user's level of self-awareness and their ability to reflect on their own thoughts and feelings.
6. Note any strengths, resources, or positive coping strategies the user demonstrates.
7. Identify areas where the user might benefit from further reflection or professional support.

## With all of the above in mind - craft the insights. Put all your observations in the description section of the particular insight.
    `,
  example_insights: `
<analysis>
    <conversation_title>Self Reflection</conversation_title>

    <conversation_summary>Discussion about recognising variations in emotional states and self awareness</conversation_summary>

    <conversation_highlights>
        <insight>
            <title>Emotional Pattern Recognition</title>
            <description>You tend to experience heightened anxiety on Sunday evenings, which may be linked to anticipation of the upcoming work week. Consider implementing a relaxing Sunday evening routine to ease this transition.</description>
            <emoji>🔄</emoji>
        </insight>
        <insight>
            <title>Behavioral Insight</title>
            <description>You've shown a tendency to avoid confrontation. Gradually practicing assertiveness in low-stakes situations could lead to more fulfilling relationships and improved self-advocacy.</description>
            <emoji>🗣️</emoji>
        </insight>
        <insight>
            <title>Cognitive Restructuring Opportunity</title>
            <description>I've noticed you often engage in 'catastrophizing' when facing challenges. By recognizing this thought pattern, we can work on reframing these situations more realistically, potentially reducing your anxiety levels.</description>
            <emoji>🧠</emoji>
        </insight>
    </conversation_highlights>
</analysis>

`,
  output_format: `
 <analysis>

    <conversation_title>[Brief title of the entire conversation]</conversation_title>

    <conversation_summary>[Brief summary of the entire conversation]</conversation_summary>

    <conversation_highlights>
        <insight>
            <title>[Brief Title of the observed insight]</title>
            <description>[Description, supporting evidence and suggestions]</description>
            <emoji>[A single relevant emoji]</emoji>
        </insight>
        <insight>
            <title>[Brief Title of the observed insight]</title>
            <description>[Description, supporting evidence and suggestions]</description>
            <emoji>[A single relevant emoji]</emoji>
        </insight>
        <insight>
            <title>[Brief Title of the observed insight]</title>
            <description>[Description, supporting evidence and suggestions]</description>
            <emoji>[A single relevant emoji]</emoji>
        </insight>
    </conversation_highlights>

</analysis>`,
};

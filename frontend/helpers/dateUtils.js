export function parseCustomDate(dateStr) {
    if (!dateStr) return null;

    const cleaned = dateStr.replace('@', '').trim();
    const parsed = new Date(cleaned);

    return isNaN(parsed.getTime()) ? null : parsed;
}

export async function getLatestEnrolledTimeFromFirstRow(table) {
    const query = await table.selectRecordsAsync({ fields: ['Enrolled'] });
    const firstRecord = query.records[0];

    if (!firstRecord) return null;

    const enrolledText = firstRecord.getCellValueAsString('Enrolled');
    return parseCustomDate(enrolledText);
}

export function getWeekNumberFromDate(dateStr) {
    const campStart = new Date("2025-07-07");
    const targetDate = new Date(dateStr);
    const diffInDays = Math.floor((targetDate - campStart) / (1000 * 60 * 60 * 24));
    return Math.floor(diffInDays / 7) + 1;
}

export function extractDateAndDay(classText) {
    const regex = /Extended Care - (\w+), ([A-Za-z]+ \d{1,2})/;
    const match = classText.match(regex);
    if (!match) return null;

    const dayOfWeek = match[1];
    const dateStr = `${match[2]}, 2025`;
    return { dayOfWeek, dateStr };
}
export function isWithinFilter(
  recordDate: Date | null,
  startDate: string,
  endDate: string,
  allowInvalid: boolean,
): boolean {
  if (recordDate === null) {
    return allowInvalid;
  } else {
    const isAfterStart =
      startDate === "" || recordDate > new Date(`${startDate}T00:00:00`);
    const isBeforeEnd =
      endDate === "" || recordDate < new Date(`${endDate}T23:59:59`);

    return isAfterStart && isBeforeEnd;
  }
}

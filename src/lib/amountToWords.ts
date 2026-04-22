/**
 * Converts a number into words in the Indian numbering system (Lakh/Crore)
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const doubleDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    let str = "";
    if (n >= 100) {
      str += singleDigits[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tensPlace[Math.floor(n / 10)] + " ";
      n %= 10;
    } else if (n >= 10) {
      str += doubleDigits[n - 10] + " ";
      return str;
    }
    if (n > 0) {
      str += singleDigits[n] + " ";
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;
  const remaining = Math.floor(amount);
  const paise = Math.round((amount - remaining) * 100);

  if (crore > 0) result += convertGroup(crore) + "Crore ";
  if (lakh > 0) result += convertGroup(lakh) + "Lakh ";
  if (thousand > 0) result += convertGroup(thousand) + "Thousand ";
  if (remaining > 0) result += convertGroup(remaining);

  if (result !== "") {
    result = result.trim() + " Rupees";
  }

  if (paise > 0) {
    if (result !== "") result += " and ";
    result += convertGroup(paise) + "Paise";
  }

  return (result + " Only").trim();
}

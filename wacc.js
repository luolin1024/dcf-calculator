const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        // 金额以万元为单位
        const E = ref(0);              // 市值（万元）
        const D = ref(0);              // 有息负债（万元）
        const interest = ref(0);       // 利息费用（万元）
        const incomeBeforeTax = ref(0); // 利润总额（万元）
        const incomeTax = ref(0);      // 所得税费用（万元）
        const beta = ref(1.1);

        // 市场参数（可输入）
        const rf = ref(0.026);    // 无风险利率
        const ERP = ref(0.06);    // 市场风险溢价

        // 结果
        const rd = ref(0);
        const rdAfterTax = ref(0);
        const re = ref(0);
        const equityWeight = ref(0);
        const debtWeight = ref(0);
        const wacc = ref(0);

        const calculated = ref(false);
        const error = ref("");

        // ROIC相关变量
        const operatingProfit = ref(11968858);           // 营业利润
        const interestExpense = ref(1447);           // 利息支出
        const totalProfit = ref(11963857);               // 利润总额
        const roicIncomeTax = ref(3030385);                 // 所得税费用
        const parentEquity = ref(23310598);              // 归属于母公司所有者权益合计
        const interestBearingDebt = ref(0);       // 有息负债

        // ROIC结果
        const roic = ref(0);
        const calculatedNopat = ref(0);
        const calculatedInvestedCapital = ref(0);
        const roicCalculated = ref(false);
        const roicError = ref("");
        const roicCalculationMethod = ref("");
        const investedCapitalMethod = ref("");
        const roicComparison = ref({});

        function validateInputs() {
            error.value = "";
            if (E.value < 0 || D.value < 0 || interest.value < 0) {
                error.value = "市值、有息负债和利息费用不能为负数。";
                return false;
            }
            if (incomeBeforeTax.value <= 0) {
                error.value = "利润总额必须大于0。";
                return false;
            }
            if (incomeTax.value < 0) {
                error.value = "所得税费用不能为负数。";
                return false;
            }
            if (incomeTax.value >= incomeBeforeTax.value) {
                error.value = "所得税费用必须小于利润总额。";
                return false;
            }
            if (D.value === 0 && interest.value !== 0) {
                error.value = "当有利息费用但有息负债为 0 时，请确认输入是否正确。";
                return false;
            }
            if (E.value === 0 && D.value === 0) {
                error.value = "市值和有息负债不能同时为 0。";
                return false;
            }
            return true;
        }

        function calculateWACC() {
            calculated.value = false;
            if (!validateInputs()) return;

            // 计算税率：所得税费用 / 利润总额
            const taxRate = incomeTax.value / incomeBeforeTax.value;

            // 计算 r_d：利息费用 / 有息负债（单位一致，万元）
            if (D.value === 0) {
                rd.value = 0;
            } else {
                rd.value = interest.value / D.value;
            }
            rdAfterTax.value = rd.value * (1 - taxRate);

            // 股权成本 CAPM
            re.value = rf.value + beta.value * ERP.value;

            // 权重（以市值 + 有息负债为基准）
            const total = (E.value || 0) + (D.value || 0);
            equityWeight.value = total === 0 ? 0 : (E.value / total);
            debtWeight.value = total === 0 ? 0 : (D.value / total);

            // WACC
            wacc.value = equityWeight.value * re.value + debtWeight.value * rdAfterTax.value;

            calculated.value = true;
        }

        function formatPercent(x) {
            if (isNaN(x) || x === Infinity) return "-";
            return (x * 100).toFixed(4) + " %";
        }

        function formatCurrency(x) {
            if (isNaN(x) || x === Infinity) return "-";
            return x.toFixed(2) + " 万元";
        }

        function validateROICInputs() {
            roicError.value = "";
            
            if (operatingProfit.value === 0) {
                roicError.value = "营业利润不能为0。";
                return false;
            }
            
            if (parentEquity.value < 0 || interestBearingDebt.value < 0) {
                roicError.value = "归母所有者权益和有息负债不能为负数。";
                return false;
            }
            
            const investedCapital = parentEquity.value + interestBearingDebt.value;
            if (investedCapital <= 0) {
                roicError.value = "投入资本（归母所有者权益 + 有息负债）必须大于0。";
                return false;
            }
            
            return true;
        }

        function calculateROIC() {
            roicCalculated.value = false;
            if (!validateROICInputs()) return;

            // 计算NOPAT：营业利润 - 利息支出 × (1 - 税率)
            // 更准确的NOPAT计算：扣除利息支出的税后影响
            const taxRate = totalProfit.value > 0 ? roicIncomeTax.value / totalProfit.value : 0;
            calculatedNopat.value = (operatingProfit.value + interestExpense.value)* (1 - taxRate);
            roicCalculationMethod.value = `(营业利润 + 利息支出) × (1 - 税率${(taxRate * 100).toFixed(2)}%)`;

            // 计算投入资本：归母所有者权益 + 有息负债
            calculatedInvestedCapital.value = parentEquity.value + interestBearingDebt.value;
            investedCapitalMethod.value = "归母所有者权益 + 有息负债";

            // 计算ROIC
            roic.value = calculatedNopat.value / calculatedInvestedCapital.value;

            // 与WACC比较
            if (calculated.value && !error.value) {
                const roicPercent = roic.value * 100;
                const waccPercent = wacc.value * 100;
                
                if (roicPercent > waccPercent) {
                    roicComparison.value = {
                        wacc: true,
                        result: `ROIC > WACC (${roicPercent.toFixed(2)}% > ${waccPercent.toFixed(2)}%)`,
                        explanation: "创造价值：投资回报高于资本成本"
                    };
                } else if (roicPercent < waccPercent) {
                    roicComparison.value = {
                        wacc: true,
                        result: `ROIC < WACC (${roicPercent.toFixed(2)}% < ${waccPercent.toFixed(2)}%)`,
                        explanation: "损害价值：投资回报低于资本成本"
                    };
                } else {
                    roicComparison.value = {
                        wacc: true,
                        result: `ROIC = WACC (${roicPercent.toFixed(2)}% = ${waccPercent.toFixed(2)}%)`,
                        explanation: "维持价值：投资回报等于资本成本"
                    };
                }
            } else {
                roicComparison.value = { wacc: false };
            }

            roicCalculated.value = true;
        }

        const equityWeightDisplay = computed(() => {
            if (!calculated.value) return "-";
            return (equityWeight.value * 100).toFixed(4) + " %";
        });
        const debtWeightDisplay = computed(() => {
            if (!calculated.value) return "-";
            return (debtWeight.value * 100).toFixed(4) + " %";
        });

        return {
            E, D, interest, incomeBeforeTax, incomeTax, beta, rf, ERP,
            rd, rdAfterTax, re, equityWeight, debtWeight, wacc,
            calculateWACC, formatPercent, calculated, error,
            equityWeightDisplay, debtWeightDisplay,
            // ROIC相关
            operatingProfit, interestExpense, totalProfit, roicIncomeTax,
            parentEquity, interestBearingDebt, roic, calculatedNopat, calculatedInvestedCapital,
            calculateROIC, formatCurrency, roicCalculated, roicError,
            roicCalculationMethod, investedCapitalMethod, roicComparison
        };
    }
}).mount("#app");
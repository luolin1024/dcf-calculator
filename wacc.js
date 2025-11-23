const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        // 金额以万元为单位
        const E = ref(0);         // 市值（万元）
        const D = ref(0);         // 有息负债（万元）
        const interest = ref(0);  // 利息费用（万元）
        const taxRate = ref(0.25);
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

        function validateInputs() {
            error.value = "";
            if (E.value < 0 || D.value < 0 || interest.value < 0) {
                error.value = "市值、有息负债和利息费用不能为负数。";
                return false;
            }
            if (taxRate.value < 0 || taxRate.value > 1) {
                error.value = "税率请输入 0 到 1 之间的小数（例如 25% 输入 0.25）。";
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

            // 计算 r_d：利息费用 / 有息负债（单位一致，万元）
            if (D.value === 0) {
                rd.value = 0;
            } else {
                rd.value = interest.value / D.value;
            }
            rdAfterTax.value = rd.value * (1 - taxRate.value);

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

        const equityWeightDisplay = computed(() => {
            if (!calculated.value) return "-";
            return (equityWeight.value * 100).toFixed(4) + " %";
        });
        const debtWeightDisplay = computed(() => {
            if (!calculated.value) return "-";
            return (debtWeight.value * 100).toFixed(4) + " %";
        });

        return {
            E, D, interest, taxRate, beta, rf, ERP,
            rd, rdAfterTax, re, equityWeight, debtWeight, wacc,
            calculateWACC, formatPercent, calculated, error,
            equityWeightDisplay, debtWeightDisplay
        };
    }
}).mount("#app");
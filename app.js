const { createApp, ref, onMounted, nextTick } = Vue;

createApp({
    setup() {
        // 响应式数据
        const initialCashFlow = ref(1000);
        const growthRate = ref(10);
        const discountRate = ref(12);
        const years = ref(5);
        const terminalGrowth = ref(3);

        const results = ref({
            calculated: false,
            companyValue: 0,
            operatingValue: 0,  // 这就是经营价值（预测期现金流现值）
            terminalValue: 0,
            yearlyData: []
        });

        const chartCanvas = ref(null);
        let chartInstance = null;

        // 格式化货币显示
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        };

        // 计算DCF
        const calculateDCF = () => {
            const cashFlows = [];
            let cumulativePV = 0;
            const yearlyData = [];

            // 计算预测期现金流现值
            for (let i = 1; i <= years.value; i++) {
                const cashFlow = initialCashFlow.value * Math.pow(1 + growthRate.value / 100, i);
                const discountFactor = Math.pow(1 + discountRate.value / 100, i);
                const presentValue = cashFlow / discountFactor;
                cumulativePV += presentValue;

                yearlyData.push({
                    year: i,
                    cashFlow,
                    discountFactor,
                    presentValue,
                    cumulativePV
                });

                cashFlows.push(cashFlow);
            }

            // 计算终值
            const lastCashFlow = cashFlows[cashFlows.length - 1];
            const terminalValue = lastCashFlow * (1 + terminalGrowth.value / 100) /
                (discountRate.value / 100 - terminalGrowth.value / 100);

            const terminalValuePV = terminalValue / Math.pow(1 + discountRate.value / 100, years.value);

            const operatingValue = cumulativePV;  // 经营价值 = 预测期现金流现值总和
            const companyValue = operatingValue + terminalValuePV;

            results.value = {
                calculated: true,
                companyValue,
                operatingValue,
                terminalValue: terminalValuePV,
                yearlyData
            };

            // 使用nextTick确保DOM更新后再创建图表
            nextTick(() => {
                updateChart(yearlyData);
            });
        };

        // 更新图表
        const updateChart = (yearlyData) => {
            // 确保canvas元素存在
            if (!chartCanvas.value) {
                console.error('Canvas element not found');
                return;
            }

            // 销毁旧图表实例
            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = chartCanvas.value.getContext('2d');

            // 准备图表数据
            const labels = yearlyData.map(item => `第${item.year}年`);
            const cashFlowData = yearlyData.map(item => item.cashFlow);
            const presentValueData = yearlyData.map(item => item.presentValue);

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '自由现金流 (万元)',
                            data: cashFlowData,
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: '现值 (万元)',
                            data: presentValueData,
                            borderColor: '#764ba2',
                            backgroundColor: 'rgba(118, 75, 162, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '现金流趋势分析',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '金额 (万元)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('zh-CN');
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '年份'
                            }
                        }
                    }
                }
            });
        };

        // GitHub仓库链接
        const githubRepo = 'https://github.com/your-username/dcf-calculator';

        // 组件挂载时自动计算一次
        onMounted(() => {
            calculateDCF();
        });

        return {
            initialCashFlow,
            growthRate,
            discountRate,
            years,
            terminalGrowth,
            results,
            chartCanvas,
            calculateDCF,
            formatCurrency,
            githubRepo
        };
    }
}).mount('#app');